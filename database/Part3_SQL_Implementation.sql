-- Core schema setup for an existing Oracle schema owner.
-- No database credentials or sample personal records are included.

CREATE TABLE Organization (
    OrganizationID    NUMBER(4)      CONSTRAINT pk_org PRIMARY KEY,
    OrganizationName  VARCHAR2(60)   NOT NULL,
    Type              VARCHAR2(20)   CONSTRAINT ck_org_type
                      CHECK (Type IN ('Government','NGO','Private')),
    HeadOffice        VARCHAR2(60)
);

CREATE TABLE Organization_Phone (
    OrganizationID    NUMBER(4),
    PhoneNo           VARCHAR2(15),
    CONSTRAINT pk_orgphone PRIMARY KEY (OrganizationID, PhoneNo),
    CONSTRAINT fk_orgphone_org FOREIGN KEY (OrganizationID)
        REFERENCES Organization(OrganizationID) ON DELETE CASCADE
);

CREATE TABLE Operator (
    OperatorID        NUMBER(4)      CONSTRAINT pk_operator PRIMARY KEY,
    FirstName         VARCHAR2(30)   NOT NULL,
    LastName          VARCHAR2(30),
    LicenseNo         VARCHAR2(20)   CONSTRAINT uq_license UNIQUE NOT NULL,
    OrganizationID    NUMBER(4),
    CONSTRAINT fk_operator_org FOREIGN KEY (OrganizationID)
        REFERENCES Organization(OrganizationID)
);

CREATE TABLE Volunteer (
    VolunteerID       NUMBER(4)      CONSTRAINT pk_volunteer PRIMARY KEY,
    FirstName         VARCHAR2(30)   NOT NULL,
    LastName          VARCHAR2(30),
    Phone             VARCHAR2(15),
    Skill             VARCHAR2(40),
    OrganizationID    NUMBER(4),
    CONSTRAINT fk_vol_org FOREIGN KEY (OrganizationID)
        REFERENCES Organization(OrganizationID)
);

CREATE TABLE Drone_Model (
    Model             VARCHAR2(30)   CONSTRAINT pk_dmodel PRIMARY KEY,
    Manufacturer      VARCHAR2(40)   NOT NULL,
    PayloadCapacity   NUMBER(5,2)    CONSTRAINT ck_payload CHECK (PayloadCapacity > 0),
    MaxFlightTime     NUMBER(4)      CONSTRAINT ck_flight CHECK (MaxFlightTime > 0)
);

CREATE TABLE Drone (
    DroneID           NUMBER(4)      CONSTRAINT pk_drone PRIMARY KEY,
    Model             VARCHAR2(30)   NOT NULL,
    BatteryLevel      NUMBER(3)      CONSTRAINT ck_battery CHECK (BatteryLevel BETWEEN 0 AND 100),
    Status            VARCHAR2(20)   DEFAULT 'Available'
                      CONSTRAINT ck_drone_status
                      CHECK (Status IN ('Available','On Mission','Under Maintenance')),
    OperatorID        NUMBER(4),
    CONSTRAINT fk_drone_model FOREIGN KEY (Model) REFERENCES Drone_Model(Model),
    CONSTRAINT fk_drone_oper  FOREIGN KEY (OperatorID) REFERENCES Operator(OperatorID)
);

CREATE TABLE Maintenance_Record (
    DroneID           NUMBER(4),
    MaintenanceID     NUMBER(4),
    MaintenanceDate   DATE           NOT NULL,
    Technician        VARCHAR2(40),
    IssueFound        VARCHAR2(100),
    RepairStatus      VARCHAR2(20)   CONSTRAINT ck_repair
                      CHECK (RepairStatus IN ('Pending','In Progress','Completed')),
    CONSTRAINT pk_maint PRIMARY KEY (DroneID, MaintenanceID),
    CONSTRAINT fk_maint_drone FOREIGN KEY (DroneID)
        REFERENCES Drone(DroneID) ON DELETE CASCADE
);

CREATE TABLE Location (
    LocationID        NUMBER(4)      CONSTRAINT pk_location PRIMARY KEY,
    AreaName          VARCHAR2(50)   NOT NULL,
    District          VARCHAR2(40),
    State             VARCHAR2(40),
    Latitude          NUMBER(9,6)    CONSTRAINT ck_lat CHECK (Latitude BETWEEN -90 AND 90),
    Longitude         NUMBER(9,6)    CONSTRAINT ck_long CHECK (Longitude BETWEEN -180 AND 180),
    RiskZone          VARCHAR2(10)   CONSTRAINT ck_risk CHECK (RiskZone IN ('Low','Medium','High'))
);

CREATE TABLE Disaster (
    DisasterID        NUMBER(4)      CONSTRAINT pk_disaster PRIMARY KEY,
    DisasterName      VARCHAR2(60)   NOT NULL,
    Type              VARCHAR2(30),
    StartDate         DATE           NOT NULL,
    EndDate           DATE,
    SeverityLevel     VARCHAR2(10)   CONSTRAINT ck_sev
                      CHECK (SeverityLevel IN ('Low','Medium','High','Critical')),
    Description       VARCHAR2(200),
    Status            VARCHAR2(10)   DEFAULT 'Active'
                      CONSTRAINT ck_dis_status CHECK (Status IN ('Active','Contained','Closed')),
    LocationID        NUMBER(4)      NOT NULL,
    CONSTRAINT ck_dis_dates CHECK (EndDate IS NULL OR EndDate >= StartDate),
    CONSTRAINT fk_dis_loc FOREIGN KEY (LocationID) REFERENCES Location(LocationID)
);

CREATE TABLE Weather_Report (
    WeatherID         NUMBER(4)      CONSTRAINT pk_weather PRIMARY KEY,
    Rainfall          NUMBER(6,2)    CONSTRAINT ck_rain CHECK (Rainfall >= 0),
    WindSpeed         NUMBER(5,1)    CONSTRAINT ck_wind CHECK (WindSpeed >= 0),
    LocationID        NUMBER(4)      NOT NULL,
    CONSTRAINT fk_weather_loc FOREIGN KEY (LocationID) REFERENCES Location(LocationID)
);

CREATE TABLE Relief_Camp (
    CampID            NUMBER(4)      CONSTRAINT pk_camp PRIMARY KEY,
    CampName          VARCHAR2(60)   NOT NULL,
    Capacity          NUMBER(5)      CONSTRAINT ck_capacity CHECK (Capacity > 0),
    ContactNo         VARCHAR2(15)
);

CREATE TABLE Victim (
    VictimID          NUMBER(5)      CONSTRAINT pk_victim PRIMARY KEY,
    VictimName        VARCHAR2(50)   NOT NULL,
    DateOfBirth       DATE,
    Gender            CHAR(1)        CONSTRAINT ck_gender CHECK (Gender IN ('M','F','O')),
    MedicalPriority   VARCHAR2(10)   CONSTRAINT ck_medprio
                      CHECK (MedicalPriority IN ('Low','Medium','High','Critical')),
    CurrentStatus     VARCHAR2(15)   DEFAULT 'Missing'
                      CONSTRAINT ck_vstatus
                      CHECK (CurrentStatus IN ('Missing','Rescued','In Camp','Hospitalized','Discharged')),
    DisasterID        NUMBER(4)      NOT NULL,
    CampID            NUMBER(4),
    CONSTRAINT fk_vic_dis  FOREIGN KEY (DisasterID) REFERENCES Disaster(DisasterID),
    CONSTRAINT fk_vic_camp FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID)
        ON DELETE SET NULL
);

CREATE TABLE Supply (
    SupplyID          NUMBER(4)      CONSTRAINT pk_supply PRIMARY KEY,
    SupplyType        VARCHAR2(40)   NOT NULL,
    QuantityAvailable NUMBER(6)      DEFAULT 0 CONSTRAINT ck_qty CHECK (QuantityAvailable >= 0),
    CampID            NUMBER(4),
    CONSTRAINT fk_supply_camp FOREIGN KEY (CampID) REFERENCES Relief_Camp(CampID)
);

CREATE TABLE Mission (
    MissionID         NUMBER(5)      CONSTRAINT pk_mission PRIMARY KEY,
    MissionType       VARCHAR2(20)   CONSTRAINT ck_mtype
                      CHECK (MissionType IN ('Rescue','Supply Drop','Surveillance','Medical')),
    MissionDate       DATE           NOT NULL,
    Priority          VARCHAR2(10)   CONSTRAINT ck_mprio
                      CHECK (Priority IN ('Low','Medium','High','Critical')),
    MissionStatus     VARCHAR2(15)   DEFAULT 'Planned'
                      CONSTRAINT ck_mstatus
                      CHECK (MissionStatus IN ('Planned','In Progress','Completed','Aborted')),
    DisasterID        NUMBER(4)      NOT NULL,
    DroneID           NUMBER(4)      NOT NULL,
    OperatorID        NUMBER(4)      NOT NULL,
    CONSTRAINT fk_m_dis  FOREIGN KEY (DisasterID) REFERENCES Disaster(DisasterID),
    CONSTRAINT fk_m_drn  FOREIGN KEY (DroneID)    REFERENCES Drone(DroneID),
    CONSTRAINT fk_m_oper FOREIGN KEY (OperatorID) REFERENCES Operator(OperatorID)
);

CREATE TABLE Mission_Victim (
    MissionID         NUMBER(5),
    VictimID          NUMBER(5),
    Outcome           VARCHAR2(20)   CONSTRAINT ck_outcome
                      CHECK (Outcome IN ('Rescued','Injured','Not Found','Deceased')),
    RescueTime        TIMESTAMP,
    CONSTRAINT pk_mv PRIMARY KEY (MissionID, VictimID),
    CONSTRAINT fk_mv_m FOREIGN KEY (MissionID) REFERENCES Mission(MissionID) ON DELETE CASCADE,
    CONSTRAINT fk_mv_v FOREIGN KEY (VictimID)  REFERENCES Victim(VictimID)  ON DELETE CASCADE
);

CREATE TABLE Mission_Supply (
    MissionID         NUMBER(5),
    SupplyID          NUMBER(4),
    Quantity          NUMBER(6)      CONSTRAINT ck_qdel CHECK (Quantity > 0),
    CONSTRAINT pk_ms PRIMARY KEY (MissionID, SupplyID),
    CONSTRAINT fk_ms_m FOREIGN KEY (MissionID) REFERENCES Mission(MissionID) ON DELETE CASCADE,
    CONSTRAINT fk_ms_s FOREIGN KEY (SupplyID)  REFERENCES Supply(SupplyID)   ON DELETE CASCADE
);

CREATE SEQUENCE seq_victim START WITH 807 INCREMENT BY 1 NOCACHE;

-- Views : derived attributes (Age, CurrentOccupancy) are computed, not stored
CREATE OR REPLACE VIEW Victim_Age_View AS
SELECT VictimID, VictimName, DateOfBirth,
       TRUNC(MONTHS_BETWEEN(SYSDATE, DateOfBirth)/12) AS Age,
       Gender, MedicalPriority, CurrentStatus
FROM   Victim;

CREATE OR REPLACE VIEW Camp_Occupancy_View AS
SELECT c.CampID, c.CampName, c.Capacity,
       COUNT(v.VictimID) AS CurrentOccupancy,
       c.Capacity - COUNT(v.VictimID) AS VacantSpace
FROM   Relief_Camp c LEFT JOIN Victim v ON c.CampID = v.CampID
GROUP  BY c.CampID, c.CampName, c.Capacity;

CREATE OR REPLACE FUNCTION get_victim_age (p_id NUMBER) RETURN NUMBER IS
    v_age NUMBER;
BEGIN
    SELECT TRUNC(MONTHS_BETWEEN(SYSDATE, DateOfBirth)/12) INTO v_age
    FROM   Victim WHERE VictimID = p_id;
    RETURN v_age;
EXCEPTION
    WHEN NO_DATA_FOUND THEN RETURN NULL;
END;
/

CREATE OR REPLACE PROCEDURE allocate_camp (p_victim NUMBER, p_camp NUMBER) IS
    v_cap  NUMBER;
    v_occ  NUMBER;
BEGIN
    SELECT Capacity INTO v_cap FROM Relief_Camp WHERE CampID = p_camp;
    SELECT COUNT(*) INTO v_occ FROM Victim WHERE CampID = p_camp;
    IF v_occ < v_cap THEN
        UPDATE Victim SET CampID = p_camp, CurrentStatus = 'In Camp'
        WHERE  VictimID = p_victim;
        DBMS_OUTPUT.PUT_LINE('Victim ' || p_victim || ' allocated to camp ' || p_camp);
    ELSE
        DBMS_OUTPUT.PUT_LINE('Camp ' || p_camp || ' is full');
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN DBMS_OUTPUT.PUT_LINE('Invalid camp ID');
END;
/

CREATE OR REPLACE TRIGGER trg_drone_on_mission
AFTER INSERT OR UPDATE OF MissionStatus ON Mission
FOR EACH ROW
BEGIN
    IF :NEW.MissionStatus = 'In Progress' THEN
        UPDATE Drone SET Status = 'On Mission' WHERE DroneID = :NEW.DroneID;
    ELSIF :NEW.MissionStatus IN ('Completed','Aborted') THEN
        UPDATE Drone SET Status = 'Available' WHERE DroneID = :NEW.DroneID;
    END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_low_battery
BEFORE INSERT ON Mission
FOR EACH ROW
DECLARE
    v_bat NUMBER;
BEGIN
    SELECT BatteryLevel INTO v_bat FROM Drone WHERE DroneID = :NEW.DroneID;
    IF v_bat < 30 THEN
        RAISE_APPLICATION_ERROR(-20001, 'Drone battery too low for mission');
    END IF;
END;
/

