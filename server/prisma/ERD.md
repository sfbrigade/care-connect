```mermaid
erDiagram

        PlacementRequestStatus {
            PENDING PENDING
APPROVED APPROVED
DENIED DENIED
CANCELLED CANCELLED
EXPIRED EXPIRED
        }
    


        FacilityType {
            DIDO DIDO
LESC LESC
        }
    


        FacilityUpdateMethod {
            INTEGRATION INTEGRATION
API API
MANUAL MANUAL
AUTOMATED_CALL AUTOMATED_CALL
AUTOMATED_TEXT AUTOMATED_TEXT
WHITEBOARD WHITEBOARD
OTHER OTHER
        }
    


        FacilityEligibilityType {
            AGE AGE
GENDER GENDER
AMBULATORY AMBULATORY
MOBILITY_DEVICES MOBILITY_DEVICES
ADL_INDEPENDENT ADL_INDEPENDENT
HOUSING_STATUS HOUSING_STATUS
NEIGHBORHOOD NEIGHBORHOOD
SEXUAL_ORIENTATION SEXUAL_ORIENTATION
RACE RACE
LANGUAGE LANGUAGE
PETS PETS
BELONGINGS BELONGINGS
OTHER OTHER
        }
    


        BedHoldStatus {
            ACTIVE ACTIVE
EXTENDED EXTENDED
CANCELLED CANCELLED
EXPIRED EXPIRED
TRANSFERRED TRANSFERRED
        }
    
  "User" {
    String id "🗝️"
    String firstName 
    String lastName 
    String email 
    String picture "❓"
    Boolean isAdmin 
    String hashedPassword 
    DateTime deactivatedAt "❓"
    String passwordResetToken "❓"
    DateTime passwordResetExpiresAt "❓"
    String badgeNumber "❓"
    String rank "❓"
    String unit "❓"
    DateTime updatedAt 
    DateTime createdAt 
    }
  

  "Invite" {
    String id "🗝️"
    String firstName 
    String lastName "❓"
    String email 
    String message "❓"
    DateTime updatedAt 
    DateTime createdAt 
    String createdById 
    DateTime acceptedAt "❓"
    String acceptedById "❓"
    DateTime revokedAt "❓"
    String revokedById "❓"
    }
  

  "Facility" {
    String id "🗝️"
    String name 
    FacilityType type 
    String subdomain "❓"
    String description "❓"
    String phone "❓"
    String email "❓"
    String website "❓"
    String addressLine1 "❓"
    String addressLine2 "❓"
    String city "❓"
    String state "❓"
    String postalCode "❓"
    String neighborhood "❓"
    String nstDistrict "❓"
    Decimal latitude "❓"
    Decimal longitude "❓"
    String timezone "❓"
    Boolean isActive 
    FacilityUpdateMethod updateMethod 
    String updateNotes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "FacilityContact" {
    String id "🗝️"
    String facilityId 
    String name 
    String role "❓"
    String email "❓"
    String phone "❓"
    String notes "❓"
    Boolean isPrimary 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Amenity" {
    String id "🗝️"
    String name 
    String description "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "ServiceType" {
    String id "🗝️"
    String code 
    String name 
    String description "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "FacilityService" {
    String facilityId "🗝️"
    String serviceTypeId "🗝️"
    Int availableBeds 
    Int reservedBeds 
    String description "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "FacilityEligibility" {
    String id "🗝️"
    String facilityId 
    FacilityEligibilityType type 
    String value "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "FacilityCapacitySnapshot" {
    String id "🗝️"
    String facilityId 
    Int totalBeds "❓"
    Int availableBeds "❓"
    Int reservedBeds "❓"
    String lastSyncSource "❓"
    DateTime observedAt 
    DateTime createdAt 
    }
  

  "Client" {
    String id "🗝️"
    String firstName 
    String lastName "❓"
    String middleInitial "❓"
    DateTime dateOfBirth "❓"
    String sex "❓"
    String race "❓"
    String address "❓"
    String driverLicense "❓"
    String localId "❓"
    String personallyIdentifiable "❓"
    String description "❓"
    String pets "❓"
    Json qualifications "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "PlacementRequest" {
    String id "🗝️"
    String referenceCode "❓"
    String facilityId 
    String clientId 
    String requestedById 
    String reviewedById "❓"
    String serviceTypeId "❓"
    PlacementRequestStatus status 
    DateTime requestedAt 
    DateTime respondedAt "❓"
    DateTime expiresAt "❓"
    String outreachNotes "❓"
    String providerNotes "❓"
    Json metadata "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "PlacementRequestEvent" {
    String id "🗝️"
    String placementRequestId 
    PlacementRequestStatus status 
    String notes "❓"
    String actorId "❓"
    DateTime createdAt 
    }
  

  "BedHold" {
    String id "🗝️"
    String facilityId 
    String serviceTypeId 
    String clientId "❓"
    String incidentId "❓"
    Int bedsRequested 
    DateTime expiresAt 
    BedHoldStatus status 
    String createdById "❓"
    DateTime cancelledAt "❓"
    String cancelledById "❓"
    DateTime extendedAt "❓"
    DateTime transferredAt "❓"
    String transferredById "❓"
    String transferToken "❓"
    DateTime transferTokenExpiresAt "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Incident" {
    String id "🗝️"
    String cadNumber 
    String locationArrested "❓"
    DateTime dateTimeArrested 
    String charge 
    String unit "❓"
    String badgeNumber "❓"
    String agency "❓"
    String createdById 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Feedback" {
    String id "🗝️"
    String message 
    String userEmail "❓"
    String userAgent "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  
    "User" o{--}o "Invite" : ""
    "User" o{--}o "Invite" : ""
    "User" o{--}o "Invite" : ""
    "User" o{--}o "PlacementRequest" : ""
    "User" o{--}o "PlacementRequest" : ""
    "User" o{--}o "PlacementRequestEvent" : ""
    "User" o{--}o "BedHold" : ""
    "User" o{--}o "BedHold" : ""
    "User" o{--}o "BedHold" : ""
    "User" o{--}o "Incident" : ""
    "Invite" o|--|| "User" : "createdBy"
    "Invite" o|--|o "User" : "acceptedBy"
    "Invite" o|--|o "User" : "revokedBy"
    "Facility" o|--|| "FacilityType" : "enum:type"
    "Facility" o|--|| "FacilityUpdateMethod" : "enum:updateMethod"
    "Facility" o{--}o "FacilityCapacitySnapshot" : ""
    "Facility" o{--}o "Amenity" : ""
    "Facility" o{--}o "FacilityService" : ""
    "Facility" o{--}o "FacilityEligibility" : ""
    "Facility" o{--}o "FacilityContact" : ""
    "Facility" o{--}o "PlacementRequest" : ""
    "Facility" o{--}o "BedHold" : ""
    "FacilityContact" o|--|| "Facility" : "facility"
    "ServiceType" o{--}o "FacilityService" : ""
    "ServiceType" o{--}o "PlacementRequest" : ""
    "ServiceType" o{--}o "BedHold" : ""
    "FacilityService" o|--|| "Facility" : "facility"
    "FacilityService" o|--|| "ServiceType" : "serviceType"
    "FacilityEligibility" o|--|| "Facility" : "facility"
    "FacilityEligibility" o|--|| "FacilityEligibilityType" : "enum:type"
    "FacilityCapacitySnapshot" o|--|| "Facility" : "facility"
    "Client" o{--}o "PlacementRequest" : ""
    "Client" o{--}o "BedHold" : ""
    "PlacementRequest" o|--|| "Facility" : "facility"
    "PlacementRequest" o|--|| "Client" : "client"
    "PlacementRequest" o|--|| "User" : "requestedBy"
    "PlacementRequest" o|--|o "User" : "reviewedBy"
    "PlacementRequest" o|--|o "ServiceType" : "serviceType"
    "PlacementRequest" o|--|| "PlacementRequestStatus" : "enum:status"
    "PlacementRequest" o{--}o "PlacementRequestEvent" : ""
    "PlacementRequestEvent" o|--|| "PlacementRequest" : "placementRequest"
    "PlacementRequestEvent" o|--|| "PlacementRequestStatus" : "enum:status"
    "PlacementRequestEvent" o|--|o "User" : "actor"
    "BedHold" o|--|| "Facility" : "facility"
    "BedHold" o|--|| "ServiceType" : "serviceType"
    "BedHold" o|--|o "Client" : "client"
    "BedHold" o|--|o "Incident" : "incident"
    "BedHold" o|--|| "BedHoldStatus" : "enum:status"
    "BedHold" o|--|o "User" : "createdBy"
    "BedHold" o|--|o "User" : "cancelledBy"
    "BedHold" o|--|o "User" : "transferredBy"
    "Incident" o|--|| "User" : "createdBy"
```
