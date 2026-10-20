package com.aerorescue.api;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ReliefController {
    private static final Logger log = LoggerFactory.getLogger(ReliefController.class);
    private final JdbcTemplate jdbc;
    private final DatabaseInitializer initializer;

    public ReliefController(JdbcTemplate jdbc, DatabaseInitializer initializer) {
        this.jdbc = jdbc;
        this.initializer = initializer;
    }

    // ==========================================
    // HEALTH & DIAGNOSTICS
    // ==========================================
    @GetMapping("/health")
    public Map<String, Object> health() {
        jdbc.queryForObject("SELECT 1", Integer.class);
        return Map.of("ok", true, "timestamp", System.currentTimeMillis());
    }

    // ==========================================
    // DASHBOARD SUMMARY STATS
    // ==========================================
    @GetMapping("/stats")
    public Map<String, Object> stats() {
        // Sync drone statuses so inFlight count is 100% synchronized with active missions
        initializer.syncDroneStatuses();

        return jdbc.queryForMap("""
                SELECT
                  (SELECT COUNT(*) FROM drone) AS "drones",
                  (SELECT COUNT(*) FROM drone WHERE status = 'On Mission') AS "inFlight",
                  (SELECT COUNT(*) FROM drone WHERE status = 'Available') AS "readyDrones",
                  (SELECT COUNT(*) FROM drone WHERE status = 'Charging') AS "chargingDrones",
                  (SELECT COUNT(*) FROM drone WHERE status = 'Under Maintenance') AS "maintenanceDrones",
                  (SELECT COUNT(*) FROM mission) AS "missions",
                  (SELECT COUNT(*) FROM mission WHERE missionstatus = 'In Progress') AS "activeMissions",
                  (SELECT COUNT(*) FROM victim) AS "victims",
                  (SELECT COUNT(*) FROM victim WHERE currentstatus IN ('Rescued', 'In Camp', 'Discharged')) AS "rescued",
                  (SELECT COUNT(*) FROM relief_camp) AS "camps",
                  (SELECT COUNT(*) FROM supply) AS "supplies",
                  (SELECT COALESCE(SUM(quantityavailable), 0) FROM supply) AS "totalSupplyUnits",
                  (SELECT COUNT(*) FROM operator) AS "operators",
                  (SELECT COUNT(*) FROM organization) AS "organizations"
                """);
    }

    // ==========================================
    // DRONE MANAGEMENT
    // ==========================================
    @GetMapping("/drones")
    public List<Map<String, Object>> drones() {
        return jdbc.queryForList("""
                SELECT droneid AS "droneId",
                       model AS "model",
                       COALESCE(manufacturer, 'AeroRescue') AS "maker",
                       COALESCE(payloadcapacity, 15.0) AS "payload",
                       COALESCE(batterylevel, 100) AS "battery",
                       COALESCE(maxflighttime, 45) AS "flight",
                       CASE status
                         WHEN 'Available' THEN 'READY'
                         WHEN 'On Mission' THEN 'ACTIVE'
                         WHEN 'Charging' THEN 'CHARGING'
                         WHEN 'Under Maintenance' THEN 'MAINTENANCE'
                         ELSE 'READY'
                       END AS "status"
                FROM drone
                ORDER BY droneid ASC
                """);
    }

    @PostMapping("/drones")
    public ResponseEntity<Map<String, Object>> createDrone(@RequestBody Map<String, Object> input) {
        String model = text(input.get("model"));
        String maker = text(input.get("maker"));
        if (model.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Drone model is required.");
        }
        if (maker.isBlank()) {
            maker = "AeroRescue";
        }

        String status = toDbDroneStatus(text(input.getOrDefault("status", "READY")));
        double payload = decimal(input.get("payload"), 15.0);
        int battery = integer(input.get("battery"), 100);
        int flight = integer(input.get("flight"), 45);

        Long droneId = jdbc.queryForObject("""
                INSERT INTO drone (model, manufacturer, payloadcapacity, batterylevel, maxflighttime, status)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING droneid
                """, Long.class, model, maker, payload, battery, flight, status);

        Map<String, Object> created = new HashMap<>();
        created.put("success", true);
        created.put("droneId", droneId);
        created.put("model", model);
        created.put("maker", maker);
        created.put("payload", payload);
        created.put("battery", battery);
        created.put("flight", flight);
        created.put("status", toUiDroneStatus(status));

        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/drones/{id}")
    public ResponseEntity<Map<String, Object>> updateDrone(@PathVariable long id, @RequestBody Map<String, Object> input) {
        String model = text(input.get("model"));
        String maker = text(input.get("maker"));
        String status = input.containsKey("status") ? toDbDroneStatus(text(input.get("status"))) : null;
        Double payload = input.containsKey("payload") ? decimal(input.get("payload"), 15.0) : null;
        Integer battery = input.containsKey("battery") ? integer(input.get("battery"), 100) : null;
        Integer flight = input.containsKey("flight") ? integer(input.get("flight"), 45) : null;

        StringBuilder sql = new StringBuilder("UPDATE drone SET ");
        List<Object> params = new ArrayList<>();

        if (!model.isBlank()) {
            sql.append("model = ?, ");
            params.add(model);
        }
        if (!maker.isBlank()) {
            sql.append("manufacturer = ?, ");
            params.add(maker);
        }
        if (status != null) {
            sql.append("status = ?, ");
            params.add(status);
        }
        if (payload != null) {
            sql.append("payloadcapacity = ?, ");
            params.add(payload);
        }
        if (battery != null) {
            sql.append("batterylevel = ?, ");
            params.add(battery);
        }
        if (flight != null) {
            sql.append("maxflighttime = ?, ");
            params.add(flight);
        }

        if (params.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No changes provided.");
        }

        // Remove trailing comma
        sql.setLength(sql.length() - 2);
        sql.append(" WHERE droneid = ?");
        params.add(id);

        int updated = jdbc.update(sql.toString(), params.toArray());
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Drone not found.");
        }

        return ResponseEntity.ok(Map.of("success", true, "droneId", id));
    }

    @DeleteMapping("/drones/{id}")
    public ResponseEntity<Map<String, Object>> deleteDrone(@PathVariable long id) {
        // First disconnect from any missions so Foreign Key constraints do not prevent deletion
        jdbc.update("UPDATE mission SET droneid = NULL WHERE droneid = ?", id);

        int deleted = jdbc.update("DELETE FROM drone WHERE droneid = ?", id);
        if (deleted == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Drone not found.");
        }
        return ResponseEntity.ok(Map.of("success", true, "deletedId", id));
    }

    // ==========================================
    // MISSIONS & FLIGHT OPERATIONS
    // ==========================================
    @GetMapping("/missions")
    public List<Map<String, Object>> missions() {
        return jdbc.queryForList("""
                SELECT m.missionid AS "missionId",
                       CASE m.missiontype
                         WHEN 'Rescue' THEN 'RESCUE'
                         WHEN 'Surveillance' THEN 'SURVEY'
                         WHEN 'Supply Drop' THEN 'RELIEF'
                         ELSE UPPER(COALESCE(m.missiontype, 'RESCUE'))
                       END AS "type",
                       COALESCE(dis.disastername, 'Unassigned Zone') AS "disaster",
                       CASE WHEN dr.droneid IS NULL THEN 'Unassigned'
                            ELSE 'D' || LPAD(dr.droneid::text, 3, '0') || ' (' || dr.model || ')'
                       END AS "drone",
                       dr.droneid AS "droneId",
                       COALESCE(NULLIF(BTRIM(op.firstname || ' ' || COALESCE(op.lastname, '')), ''), 'Unassigned') AS "operator",
                       m.missiondate::text AS "date",
                       UPPER(COALESCE(m.priority, 'MEDIUM')) AS "priority",
                       CASE m.missionstatus
                         WHEN 'In Progress' THEN 'ACTIVE'
                         WHEN 'Completed' THEN 'COMPLETED'
                         WHEN 'Aborted' THEN 'ABORTED'
                         ELSE UPPER(m.missionstatus)
                       END AS "status",
                       COALESCE(m.location, 'Operational Sector') AS "location",
                       COALESCE(m.notes, '') AS "notes"
                FROM mission m
                LEFT JOIN disaster dis ON m.disasterid = dis.disasterid
                LEFT JOIN drone dr ON m.droneid = dr.droneid
                LEFT JOIN operator op ON m.operatorid = op.operatorid
                ORDER BY CASE WHEN m.missionstatus = 'In Progress' THEN 0 ELSE 1 END,
                         m.missiondate DESC, m.missionid DESC
                """);
    }

    @PostMapping("/missions")
    @Transactional
    public ResponseEntity<Map<String, Object>> createMission(@RequestBody Map<String, Object> input) {
        String type = text(input.getOrDefault("type", "Rescue"));
        String priority = text(input.getOrDefault("priority", "High"));
        String location = text(input.getOrDefault("location", "Operational Zone"));
        String notes = text(input.getOrDefault("notes", ""));

        String droneValue = text(input.get("droneId"));
        if (droneValue.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select an available drone before deploying a mission.");
        }
        Long droneId;
        try {
            droneId = Long.valueOf(droneValue);
        } catch (NumberFormatException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid drone selection.");
        }

        String droneStatus = jdbc.query("""
                SELECT status FROM drone WHERE droneid = ? FOR UPDATE
                """, rs -> rs.next() ? rs.getString(1) : null, droneId);
        if (droneStatus == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Selected drone was not found.");
        }
        if (!"Available".equals(droneStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That drone is no longer available. Refresh the fleet and choose another.");
        }

        Long operatorId = input.get("operatorId") != null && !text(input.get("operatorId")).isBlank()
                ? Long.valueOf(text(input.get("operatorId"))) : null;
        Long disasterId = input.get("disasterId") != null && !text(input.get("disasterId")).isBlank()
                ? Long.valueOf(text(input.get("disasterId"))) : null;

        if (disasterId == null) {
            List<Long> dis = jdbc.query("SELECT disasterid FROM disaster WHERE status = 'Active' LIMIT 1",
                    (rs, r) -> rs.getLong(1));
            if (!dis.isEmpty()) disasterId = dis.get(0);
        }
        if (operatorId == null) {
            List<Long> ops = jdbc.query("SELECT operatorid FROM operator LIMIT 1", (rs, r) -> rs.getLong(1));
            if (!ops.isEmpty()) operatorId = ops.get(0);
        }

        Long missionId = jdbc.queryForObject("""
                INSERT INTO mission (missiontype, missiondate, priority, missionstatus, disasterid, droneid, operatorid, location, notes)
                VALUES (?, CURRENT_DATE, ?, 'In Progress', ?, ?, ?, ?, ?)
                RETURNING missionid
                """, Long.class, type, priority, disasterId, droneId, operatorId, location, notes);

        jdbc.update("UPDATE drone SET status = 'On Mission' WHERE droneid = ?", droneId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true, "missionId", missionId));
    }

    @PutMapping("/missions/{id}/complete")
    @Transactional
    public ResponseEntity<Map<String, Object>> completeMission(@PathVariable long id) {
        // Find assigned drone ID
        List<Long> assigned = jdbc.query("SELECT droneid FROM mission WHERE missionid = ?",
                (rs, r) -> (Long) rs.getObject(1), id);

        int updated = jdbc.update("UPDATE mission SET missionstatus = 'Completed' WHERE missionid = ?", id);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mission not found.");
        }

        // Free the drone so it becomes Available / READY
        if (!assigned.isEmpty() && assigned.get(0) != null) {
            jdbc.update("UPDATE drone SET status = 'Available' WHERE droneid = ?", assigned.get(0));
        }

        return ResponseEntity.ok(Map.of("success", true, "missionId", id, "status", "COMPLETED"));
    }

    // ==========================================
    // RELIEF CAMPS
    // ==========================================
    @GetMapping("/camps")
    public List<Map<String, Object>> camps() {
        return jdbc.queryForList("""
                SELECT c.campid AS "campId",
                       c.campname AS "name",
                       c.capacity AS "capacity",
                       COALESCE(c.location, 'Sector Base') AS "location",
                       COUNT(v.victimid)::INTEGER AS "occupied",
                       (c.capacity - COUNT(v.victimid))::INTEGER AS "vacant"
                FROM relief_camp c
                LEFT JOIN victim v ON v.campid = c.campid
                GROUP BY c.campid, c.campname, c.capacity, c.location
                ORDER BY c.campid ASC
                """);
    }

    @PostMapping("/camps")
    public ResponseEntity<Map<String, Object>> createCamp(@RequestBody Map<String, Object> input) {
        String name = text(input.get("name"));
        int capacity = integer(input.get("capacity"), 100);
        String phone = text(input.get("contactPhone"));
        String location = text(input.get("location"));

        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Camp name is required.");
        }

        Long campId = jdbc.queryForObject("""
                INSERT INTO relief_camp (campname, capacity, contactno, location)
                VALUES (?, ?, ?, ?)
                RETURNING campid
                """, Long.class, name, capacity, phone, location);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true, "campId", campId));
    }

    // ==========================================
    // VICTIMS & SOS REGISTRY
    // ==========================================
    @GetMapping("/victims")
    public List<Map<String, Object>> victims() {
        return jdbc.queryForList("""
                SELECT v.victimid AS "victimId",
                       v.victimname AS "name",
                       EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.dateofbirth)) AS "age",
                       v.gender AS "gender",
                       COALESCE(v.medicalpriority, 'High') AS "priority",
                       COALESCE(v.currentstatus, 'Missing') AS "status",
                       v.campid AS "campId",
                       COALESCE(c.campname, 'Unassigned Shelter') AS "camp",
                       COALESCE(dis.disastername, 'Active Zone') AS "disaster",
                       COALESCE(l.areaname, 'Emergency Coordinate') AS "location",
                       COALESCE(v.emergencydetails, '') AS "details"
                FROM victim v
                LEFT JOIN relief_camp c ON v.campid = c.campid
                LEFT JOIN disaster dis ON v.disasterid = dis.disasterid
                LEFT JOIN location l ON dis.locationid = l.locationid
                ORDER BY v.victimid DESC
                """);
    }

    @PostMapping("/victims")
    public ResponseEntity<Map<String, Object>> createVictim(@RequestBody Map<String, Object> input) {
        String name = text(input.get("name"));
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required.");
        }

        String priority = text(input.getOrDefault("priority", "High"));
        LocalDate dob = input.get("dob") == null
                ? LocalDate.now().minusYears(30)
                : LocalDate.parse(text(input.get("dob")));
        String gender = text(input.getOrDefault("gender", "O"));
        String details = text(input.get("emergencyDetails"));

        Object disVal = input.get("disasterId");
        Long disasterId = (disVal == null || text(disVal).isBlank())
                ? jdbc.queryForObject("SELECT disasterid FROM disaster ORDER BY disasterid ASC LIMIT 1", Long.class)
                : Long.valueOf(text(disVal));

        Long campId = input.get("campId") == null || text(input.get("campId")).isBlank()
                ? null : Long.valueOf(text(input.get("campId")));

        Long victimId = jdbc.queryForObject("""
                INSERT INTO victim (victimname, dateofbirth, gender, medicalpriority, currentstatus, disasterid, campid, emergencydetails)
                VALUES (?, ?, ?, ?, 'Missing', ?, ?, ?)
                RETURNING victimid
                """, Long.class, name, Date.valueOf(dob), gender, priority, disasterId, campId, details);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true, "victimId", victimId));
    }

    // ==========================================
    // SUPPLY INVENTORY
    // ==========================================
    @GetMapping("/supplies")
    public List<Map<String, Object>> supplies() {
        return jdbc.queryForList("""
                SELECT s.supplyid AS "id",
                       s.supplytype AS "item",
                       s.quantityavailable AS "qty",
                       COALESCE(c.campname, 'Central Stock') AS "camp",
                       COALESCE(s.unit, 'units') AS "unit",
                       COALESCE(s.lastupdated, CURRENT_DATE::text) AS "updated"
                FROM supply s
                LEFT JOIN relief_camp c ON s.campid = c.campid
                ORDER BY s.quantityavailable ASC, s.supplyid ASC
                """);
    }

    @PostMapping("/supplies")
    public ResponseEntity<Map<String, Object>> createSupply(@RequestBody Map<String, Object> input) {
        String item = text(input.get("item"));
        int qty = integer(input.get("qty"), 100);
        String unit = text(input.getOrDefault("unit", "units"));
        String updated = LocalDate.now().toString();

        Long campId = input.get("campId") != null && !text(input.get("campId")).isBlank()
                ? Long.valueOf(text(input.get("campId")))
                : jdbc.queryForObject("SELECT campid FROM relief_camp LIMIT 1", Long.class);

        Long supplyId = jdbc.queryForObject("""
                INSERT INTO supply (supplytype, quantityavailable, campid, unit, lastupdated)
                VALUES (?, ?, ?, ?, ?)
                RETURNING supplyid
                """, Long.class, item, qty, campId, unit, updated);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true, "id", supplyId));
    }

    @DeleteMapping("/supplies/{id}")
    public ResponseEntity<Void> deleteSupply(@PathVariable long id) {
        jdbc.update("DELETE FROM supply WHERE supplyid = ?", id);
        return ResponseEntity.noContent().build();
    }

    // ==========================================
    // OPERATORS
    // ==========================================
    @GetMapping("/operators")
    public List<Map<String, Object>> operators() {
        return jdbc.queryForList("""
                SELECT operatorid AS "id",
                       firstname || ' ' || COALESCE(lastname, '') AS "name",
                       licenseno AS "license",
                       COALESCE(contactphone, '—') AS "phone",
                       COALESCE(status, 'AVAILABLE') AS "status"
                FROM operator
                ORDER BY operatorid ASC
                """);
    }

    @PostMapping("/operators")
    public ResponseEntity<Map<String, Object>> createOperator(@RequestBody Map<String, Object> input) {
        String first = text(input.get("firstName"));
        String last = text(input.get("lastName"));
        String license = text(input.get("license"));
        String phone = text(input.get("phone"));

        Long opId = jdbc.queryForObject("""
                INSERT INTO operator (firstname, lastname, licenseno, contactphone, status)
                VALUES (?, ?, ?, ?, 'AVAILABLE')
                RETURNING operatorid
                """, Long.class, first, last, license, phone);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true, "id", opId));
    }

    // ==========================================
    // ORGANIZATIONS
    // ==========================================
    @GetMapping("/organizations")
    public List<Map<String, Object>> organizations() {
        return jdbc.queryForList("""
                SELECT orgid AS "id",
                       orgname AS "name",
                       orgtype AS "type",
                       COALESCE(headoffice, 'National Command') AS "headOffice",
                       COALESCE(contactemail, '—') AS "email",
                       COALESCE(contactphone, '—') AS "phone"
                FROM organization
                ORDER BY orgid ASC
                """);
    }

    // ==========================================
    // SQL PLAYGROUND / CONSOLE
    // ==========================================
    @PostMapping("/sql")
    public ResponseEntity<Map<String, Object>> executeSql(@RequestBody Map<String, Object> input) {
        String sql = text(input.get("sql"));
        if (sql.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "SQL query cannot be empty.");
        }

        String trimmed = sql.trim().toUpperCase();
        Map<String, Object> response = new HashMap<>();
        response.put("sql", sql);

        try {
            if (trimmed.startsWith("SELECT") || trimmed.startsWith("WITH")) {
                List<Map<String, Object>> rows = jdbc.queryForList(sql);
                response.put("success", true);
                response.put("rowCount", rows.size());
                response.put("rows", rows);
                if (!rows.isEmpty()) {
                    response.put("columns", new ArrayList<>(rows.get(0).keySet()));
                } else {
                    response.put("columns", List.of());
                }
            } else {
                int affected = jdbc.update(sql);
                response.put("success", true);
                response.put("affectedRows", affected);
                response.put("message", "Query executed successfully. " + affected + " rows affected.");
                // Synchronize if drone or mission was modified
                if (trimmed.contains("DRONE") || trimmed.contains("MISSION")) {
                    initializer.syncDroneStatuses();
                }
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    // ==========================================
    // EXCEPTION HANDLERS & HELPERS
    // ==========================================
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> databaseError(DataAccessException error) {
        log.error("Database query exception: {}", error.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Database operation failed: " + error.getMostSpecificCause().getMessage()));
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static double decimal(Object value, double fallback) {
        if (value == null || text(value).isBlank()) return fallback;
        try {
            return Double.parseDouble(text(value));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static int integer(Object value, int fallback) {
        if (value == null || text(value).isBlank()) return fallback;
        try {
            return Integer.parseInt(text(value));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private static String toDbDroneStatus(String status) {
        return switch (status.toUpperCase()) {
            case "READY" -> "Available";
            case "ACTIVE" -> "On Mission";
            case "CHARGING" -> "Charging";
            case "MAINTENANCE" -> "Under Maintenance";
            case "AVAILABLE" -> "Available";
            case "ON MISSION" -> "On Mission";
            case "UNDER MAINTENANCE" -> "Under Maintenance";
            default -> "Available";
        };
    }

    private static String toUiDroneStatus(String dbStatus) {
        return switch (dbStatus) {
            case "Available" -> "READY";
            case "On Mission" -> "ACTIVE";
            case "Charging" -> "CHARGING";
            case "Under Maintenance" -> "MAINTENANCE";
            default -> "READY";
        };
    }
}
