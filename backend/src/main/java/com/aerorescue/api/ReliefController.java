package com.aerorescue.api;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class ReliefController {
    private final JdbcTemplate jdbc;

    public ReliefController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/health")
    public Map<String, Boolean> health() {
        jdbc.queryForObject("SELECT 1", Integer.class);
        return Map.of("ok", true);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return jdbc.queryForMap("""
                SELECT
                  (SELECT COUNT(*) FROM Drone) AS "drones",
                  (SELECT COUNT(*) FROM Drone WHERE Status = 'On Mission') AS "inFlight",
                  (SELECT COUNT(*) FROM Drone WHERE Status = 'Available') AS "readyDrones",
                  (SELECT COUNT(*) FROM Drone WHERE Status = 'Charging') AS "chargingDrones",
                  (SELECT COUNT(*) FROM Mission) AS "missions",
                  (SELECT COUNT(*) FROM Mission WHERE MissionStatus = 'In Progress') AS "activeMissions",
                  (SELECT COUNT(*) FROM Victim) AS "victims",
                  (SELECT COUNT(*) FROM Victim WHERE CurrentStatus <> 'Missing') AS "rescued",
                  (SELECT COUNT(*) FROM Relief_Camp) AS "camps",
                  (SELECT COUNT(*) FROM Supply) AS "supplies",
                  (SELECT COUNT(*) FROM Operator) AS "operators"
                """);
    }

    @GetMapping("/drones")
    public List<Map<String, Object>> drones() {
        return jdbc.queryForList("""
                SELECT DroneID AS "droneId", Model AS "model", Manufacturer AS "maker",
                       PayloadCapacity AS "payload", BatteryLevel AS "battery",
                       MaxFlightTime AS "flight",
                       CASE Status
                         WHEN 'Available' THEN 'READY'
                         WHEN 'On Mission' THEN 'ACTIVE'
                         WHEN 'Charging' THEN 'CHARGING'
                         WHEN 'Under Maintenance' THEN 'MAINTENANCE'
                       END AS "status"
                FROM Drone
                ORDER BY DroneID
                """);
    }

    @PostMapping("/drones")
    public ResponseEntity<Map<String, Object>> createDrone(@RequestBody Map<String, Object> input) {
        String model = text(input.get("model"));
        String maker = text(input.get("maker"));
        if (model.isBlank() || maker.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Model and manufacturer are required.");
        }

        String status = droneStatus(text(input.getOrDefault("status", "READY")));
        double payload = decimal(input.get("payload"), 0);
        if (payload < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload cannot be negative.");
        }

        Long droneId = jdbc.queryForObject("""
                INSERT INTO Drone (Model, Manufacturer, PayloadCapacity, BatteryLevel, MaxFlightTime, Status)
                VALUES (?, ?, ?, 100, 40, ?)
                RETURNING DroneID
                """, Long.class, model, maker, payload, status);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("droneId", droneId));
    }

    @PutMapping("/drones/{id}")
    public ResponseEntity<Void> updateDrone(@PathVariable long id, @RequestBody Map<String, Object> input) {
        String model = text(input.get("model"));
        if (model.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Model is required.");
        }
        if (jdbc.update("UPDATE Drone SET Model = ? WHERE DroneID = ?", model, id) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Drone not found.");
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/drones/{id}")
    public ResponseEntity<Void> deleteDrone(@PathVariable long id) {
        if (jdbc.update("DELETE FROM Drone WHERE DroneID = ?", id) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Drone not found.");
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/missions")
    public List<Map<String, Object>> missions() {
        return jdbc.queryForList("""
                SELECT m.MissionID AS "missionId",
                       CASE m.MissionType
                         WHEN 'Rescue' THEN 'RESCUE'
                         WHEN 'Surveillance' THEN 'SURVEY'
                         WHEN 'Supply Drop' THEN 'RELIEF'
                         ELSE UPPER(COALESCE(m.MissionType, 'MISSION'))
                       END AS "type",
                       COALESCE(dis.DisasterName, 'Unassigned') AS "disaster",
                       CASE WHEN dr.DroneID IS NULL THEN 'Unassigned'
                            ELSE 'D' || LPAD(dr.DroneID::text, 3, '0') || ' (' || dr.Model || ')'
                       END AS "drone",
                       COALESCE(NULLIF(BTRIM(op.FirstName || ' ' || COALESCE(op.LastName, '')), ''),
                                'Unassigned') AS "operator",
                       m.MissionDate::text AS "date",
                       UPPER(m.Priority) AS "priority",
                       CASE m.MissionStatus
                         WHEN 'In Progress' THEN 'ACTIVE'
                         WHEN 'Completed' THEN 'COMPLETED'
                         ELSE UPPER(m.MissionStatus)
                       END AS "status"
                FROM Mission m
                LEFT JOIN Disaster dis ON m.DisasterID = dis.DisasterID
                LEFT JOIN Drone dr ON m.DroneID = dr.DroneID
                LEFT JOIN Operator op ON m.OperatorID = op.OperatorID
                ORDER BY CASE WHEN m.MissionStatus = 'In Progress' THEN 0 ELSE 1 END,
                         m.MissionDate DESC, m.MissionID
                """);
    }

    @PutMapping("/missions/{id}/complete")
    public ResponseEntity<Void> completeMission(@PathVariable long id) {
        if (jdbc.update("UPDATE Mission SET MissionStatus = 'Completed' WHERE MissionID = ?", id) == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mission not found.");
        }
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/camps")
    public List<Map<String, Object>> camps() {
        return jdbc.queryForList("""
                SELECT CampID AS "campId", CampName AS "name", Capacity AS "capacity",
                       CurrentOccupancy AS "occupied", VacantSpace AS "vacant"
                FROM Camp_Occupancy_View
                ORDER BY CampID
                """);
    }

    @GetMapping("/victims")
    public List<Map<String, Object>> victims() {
        return jdbc.queryForList("""
                SELECT v.VictimID AS "victimId", v.VictimName AS "name",
                       EXTRACT(YEAR FROM AGE(CURRENT_DATE, v.DateOfBirth)) AS "age",
                       v.Gender AS "gender", v.MedicalPriority AS "priority",
                       v.CurrentStatus AS "status", v.CampID AS "campId",
                       c.CampName AS "camp", dis.DisasterName AS "disaster", l.AreaName AS "location"
                FROM Victim v
                LEFT JOIN Relief_Camp c ON v.CampID = c.CampID
                JOIN Disaster dis ON v.DisasterID = dis.DisasterID
                JOIN Location l ON dis.LocationID = l.LocationID
                ORDER BY v.VictimID
                """);
    }

    @PostMapping("/victims")
    public ResponseEntity<Map<String, Object>> createVictim(@RequestBody Map<String, Object> input) {
        String name = text(input.get("name"));
        if (name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required.");
        }

        String priority = text(input.getOrDefault("priority", "High"));
        if (!List.of("Low", "Medium", "High", "Critical").contains(priority)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid priority.");
        }

        LocalDate dob = input.get("dob") == null
                ? LocalDate.now().minusYears(30)
                : LocalDate.parse(text(input.get("dob")));
        String gender = text(input.getOrDefault("gender", "O"));

        Object disasterValue = input.get("disasterId");
        Long disasterId;
        if (disasterValue == null || text(disasterValue).isBlank()) {
            List<Long> active = jdbc.query("""
                    SELECT DisasterID FROM Disaster WHERE Status = 'Active'
                    ORDER BY StartDate DESC FETCH FIRST 1 ROWS ONLY
                    """, (rs, row) -> rs.getLong(1));
            if (active.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "No active disaster to attach this victim to.");
            }
            disasterId = active.get(0);
        } else {
            disasterId = Long.valueOf(text(disasterValue));
        }

        Long campId = input.get("campId") == null || text(input.get("campId")).isBlank()
                ? null : Long.valueOf(text(input.get("campId")));
        Long victimId = jdbc.queryForObject("""
                INSERT INTO Victim
                  (VictimName, DateOfBirth, Gender, MedicalPriority,
                   CurrentStatus, DisasterID, CampID)
                VALUES (?, ?, ?, ?, 'Missing', ?, ?)
                RETURNING VictimID
                """, Long.class, name, Date.valueOf(dob), gender, priority, disasterId, campId);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("victimId", victimId));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> databaseError(DataAccessException error) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Database request failed. Check the PostgreSQL connection and schema."));
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private static double decimal(Object value, double fallback) {
        if (value == null || text(value).isBlank()) return fallback;
        try {
            return Double.parseDouble(text(value));
        } catch (NumberFormatException error) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payload must be a number.");
        }
    }

    private static String droneStatus(String status) {
        return switch (status) {
            case "READY" -> "Available";
            case "ACTIVE" -> "On Mission";
            case "CHARGING" -> "Charging";
            case "MAINTENANCE" -> "Under Maintenance";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid drone status.");
        };
    }
}

