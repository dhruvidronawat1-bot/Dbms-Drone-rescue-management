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
import org.springframework.web.bind.annotation.PostMapping;
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
        jdbc.queryForObject("SELECT 1 FROM DUAL", Integer.class);
        return Map.of("ok", true);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return jdbc.queryForMap("""
                SELECT
                  (SELECT COUNT(*) FROM Drone) AS "drones",
                  (SELECT COUNT(*) FROM Drone WHERE Status = 'On Mission') AS "inFlight",
                  (SELECT COUNT(*) FROM Mission) AS "missions",
                  (SELECT COUNT(*) FROM Mission WHERE MissionStatus = 'In Progress') AS "activeMissions",
                  (SELECT COUNT(*) FROM Victim) AS "victims",
                  (SELECT COUNT(*) FROM Victim WHERE CurrentStatus <> 'Missing') AS "rescued",
                  (SELECT COUNT(*) FROM Relief_Camp) AS "camps",
                  (SELECT COUNT(*) FROM Supply) AS "supplies",
                  (SELECT COUNT(*) FROM Operator) AS "operators"
                FROM DUAL
                """);
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
                       TRUNC(MONTHS_BETWEEN(SYSDATE, v.DateOfBirth) / 12) AS "age",
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
        Long victimId = jdbc.queryForObject("SELECT seq_victim.NEXTVAL FROM DUAL", Long.class);
        jdbc.update("""
                INSERT INTO Victim
                  (VictimID, VictimName, DateOfBirth, Gender, MedicalPriority,
                   CurrentStatus, DisasterID, CampID)
                VALUES (?, ?, ?, ?, ?, 'Missing', ?, ?)
                """, victimId, name, Date.valueOf(dob), gender, priority, disasterId, campId);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("victimId", victimId));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> databaseError(DataAccessException error) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Database request failed. Check the Oracle connection and schema."));
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }
}
