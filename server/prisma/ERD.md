```mermaid
erDiagram

        BedTypeEnum {
            BED BED
CHAIR CHAIR
        }
    


        TernaryEnum {
            YES YES
NO NO
UNKNOWN UNKNOWN
        }
    


        FacilityTypeEnum {
            DIDO DIDO
LESC LESC
        }
    


        FacilityStatusEnum {
            CLOSED CLOSED
OPEN_NOT_ACCEPTING OPEN_NOT_ACCEPTING
OPEN_ACCEPTING OPEN_ACCEPTING
        }
    


        FacilityUpdateMethodEnum {
            INTEGRATION INTEGRATION
API API
MANUAL MANUAL
AUTOMATED_CALL AUTOMATED_CALL
AUTOMATED_TEXT AUTOMATED_TEXT
WHITEBOARD WHITEBOARD
OTHER OTHER
        }
    


        FacilityEligibilityTypeEnum {
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
    


        HoldStatusEnum {
            ACTIVE ACTIVE
CANCELLED CANCELLED
EXPIRED EXPIRED
COMPLETED COMPLETED
        }
    


        PropertyEnum {
            NONE NONE
SMALL SMALL
MEDIUM MEDIUM
LARGE LARGE
        }
    


        EncounteredViaEnum {
            ON_VIEW ON_VIEW
DISPATCHED DISPATCHED
        }
    


        RaceEnum {
            WHITE WHITE
BLACK BLACK
HISPANIC HISPANIC
ASIAN ASIAN
OTHER OTHER
UNKNOWN UNKNOWN
        }
    


        SexEnum {
            MALE MALE
FEMALE FEMALE
OTHER OTHER
UNKNOWN UNKNOWN
        }
    


        RoleEnum {
            FIELD FIELD
CUSTODY CUSTODY
CARE CARE
        }
    


        SubjectStatusEnum {
            DETAINED DETAINED
ONSITE_AWAITING_TRANSFER ONSITE_AWAITING_TRANSFER
AWAITING_INTAKE AWAITING_INTAKE
READY_FOR_INTAKE READY_FOR_INTAKE
FAILED_INTAKE FAILED_INTAKE
ADMITTED ADMITTED
IN_CHAIR IN_CHAIR
RELEASED RELEASED
EXITED EXITED
        }
    
  "Organization" {
    String id "🗝️"
    String name 
    RoleEnum defaultRoles 
    String createdById 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Unit" {
    String id "🗝️"
    String organizationId "🗝️"
    String name 
    String createdById 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Title" {
    String id "🗝️"
    String organizationId "🗝️"
    String name 
    String createdById 
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "User" {
    String id "🗝️"
    String firstName 
    String lastName 
    String email 
    String picture "❓"
    Boolean isAdmin 
    RoleEnum roles 
    String organizationId "❓"
    String titleId "❓"
    String unitId "❓"
    String hashedPassword 
    DateTime deactivatedAt "❓"
    String passwordResetToken "❓"
    DateTime passwordResetExpiresAt "❓"
    String badgeNumber "❓"
    Boolean prop115Certified 
    DateTime updatedAt 
    DateTime createdAt 
    }
  

  "Invite" {
    String id "🗝️"
    String firstName 
    String lastName 
    String email 
    String message "❓"
    String organizationId "❓"
    String titleId "❓"
    String badgeNumber "❓"
    Boolean prop115Certified 
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
    FacilityTypeEnum type 
    String serviceTypeId 
    FacilityStatusEnum status 
    String statusReasonId "❓"
    String statusOther "❓"
    FacilityUpdateMethodEnum updateMethod 
    String updateNotes "❓"
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
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
    }
  

  "FacilityUpdate" {
    String id "🗝️"
    String facilityId 
    FacilityStatusEnum status 
    String statusReasonId "❓"
    String statusOther "❓"
    FacilityUpdateMethodEnum updateMethod 
    String updateNotes "❓"
    DateTime updatedAt 
    String updatedById 
    }
  

  "FacilityStatusReason" {
    String id "🗝️"
    FacilityTypeEnum type "❓"
    String description 
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
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
    String name 
    String description "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "BedType" {
    String id "🗝️"
    String facilityId "🗝️"
    BedTypeEnum type 
    Int capacity 
    Int unavailableUnoccupied 
    Int unavailableOccupied 
    Int occupied 
    Int holds 
    Int available 
    DateTime createdAt 
    String createdById 
    FacilityUpdateMethodEnum updateMethod 
    String updateNotes "❓"
    DateTime updatedAt 
    String updatedById 
    }
  

  "BedTypeUpdate" {
    String id "🗝️"
    String bedTypeId 
    String facilityId 
    Int capacity 
    Int unavailableUnoccupied 
    Int unavailableOccupied 
    Int occupied 
    Int holds 
    Int available 
    FacilityUpdateMethodEnum updateMethod 
    String updateNotes "❓"
    DateTime updatedAt 
    String updatedById 
    }
  

  "FacilityEligibility" {
    String id "🗝️"
    String facilityId 
    FacilityEligibilityTypeEnum type 
    String value "❓"
    String notes "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Subject" {
    String id "🗝️"
    String firstName "❓"
    String lastName "❓"
    String middleInitial "❓"
    DateTime dateOfBirth "❓"
    SexEnum sex "❓"
    RaceEnum race "❓"
    String driverLicense "❓"
    String addressLine1 "❓"
    String addressLine2 "❓"
    String city "❓"
    String state "❓"
    String postalCode "❓"
    String localId "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  

  "Deflection" {
    Int id "🗝️"
    String facilityId 
    Int incidentId 
    String bedTypeId 
    String subjectId "❓"
    SubjectStatusEnum subjectStatus 
    Boolean narcoticsSubstance "❓"
    Boolean narcoticsParaphernalia "❓"
    String behavior "❓"
    PropertyEnum property "❓"
    String propertyDetails "❓"
    DateTime createdAt 
    String createdById 
    DateTime expiresAt 
    DateTime completedAt "❓"
    HoldStatusEnum status 
    Int extensionCount 
    String cancelReasonId "❓"
    DateTime cancelledAt "❓"
    String cancelledById "❓"
    DateTime transferredAt "❓"
    String transferredById "❓"
    String transferredByBadgeNumber "❓"
    Boolean transferredByProp115Certified "❓"
    String transferredByOrganizationId "❓"
    String transferredByUnitId "❓"
    String transferredByTitleId "❓"
    DateTime admittedAt "❓"
    String admittedById "❓"
    DateTime rejectedAt "❓"
    String rejectedById "❓"
    DateTime releasedAt "❓"
    String releasedById "❓"
    String releaseReasonId "❓"
    String otherReleaseReason "❓"
    String otherReleaseDestination "❓"
    String refusalReasonId "❓"
    DateTime exitedAt "❓"
    String exitedById "❓"
    String exitDestinationId "❓"
    String exitHousingStatusId "❓"
    TernaryEnum exitConnectedToCare "❓"
    TernaryEnum exitSFResident "❓"
    DateTime updatedAt 
    }
  

  "DeflectionDetailCategory" {
    String id "🗝️"
    String name 
    String createdById 
    DateTime createdAt 
    String updatedById "❓"
    DateTime updatedAt 
    }
  

  "DeflectionDetail" {
    String id "🗝️"
    String deflectionDetailCategoryId 
    String name 
    String createdById 
    DateTime createdAt 
    String updatedById "❓"
    DateTime updatedAt 
    }
  

  "DeflectionUpdate" {
    String id "🗝️"
    Int deflectionId 
    HoldStatusEnum status "❓"
    DateTime expiresAt "❓"
    Int extensionCount "❓"
    String cancelReasonId "❓"
    SubjectStatusEnum subjectStatus "❓"
    String releaseReasonId "❓"
    String otherReleaseReason "❓"
    String otherReleaseDestination "❓"
    String refusalReasonId "❓"
    String exitDestinationId "❓"
    String exitHousingStatusId "❓"
    TernaryEnum exitConnectedToCare "❓"
    TernaryEnum exitSFResident "❓"
    DateTime updatedAt 
    String updatedById 
    }
  

  "DeflectionCancelReason" {
    String id "🗝️"
    String name 
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
    }
  

  "DeflectionReleaseReason" {
    String id "🗝️"
    String name 
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
    }
  

  "DeflectionRefusalReason" {
    String id "🗝️"
    String name 
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
    }
  

  "DeflectionExitDestination" {
    String id "🗝️"
    String name 
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
    }
  

  "DeflectionExitHousingStatus" {
    String id "🗝️"
    String name 
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
    }
  

  "PropertyPhoto" {
    String id "🗝️"
    Int deflectionId 
    String file 
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
    }
  

  "Incident" {
    Int id "🗝️"
    String facilityId "🗝️"
    DateTime arrivedAt "❓"
    DateTime leftAt "❓"
    DateTime completedAt "❓"
    String addressLine1 "❓"
    String addressLine2 "❓"
    String city "❓"
    String state "❓"
    String postalCode "❓"
    Decimal latitude "❓"
    Decimal longitude "❓"
    DateTime arrestedAt "❓"
    EncounteredViaEnum encounteredVia 
    String cadNumber "❓"
    String supervisorBadgeNumber "❓"
    String createdById 
    String createdByOrganizationId "❓"
    String createdByTitleId "❓"
    String createdByUnitId "❓"
    String createdByBadgeNumber "❓"
    DateTime createdAt 
    DateTime updatedAt 
    String updatedById 
    }
  

  "Feedback" {
    String id "🗝️"
    String message 
    String userEmail "❓"
    String userAgent "❓"
    DateTime createdAt 
    DateTime updatedAt 
    }
  
    "Organization" o|--}o "RoleEnum" : "enum:defaultRoles"
    "Organization" o|--|| "User" : "createdBy"
    "Organization" o{--}o "Deflection" : ""
    "Organization" o{--}o "Incident" : ""
    "Organization" o{--}o "Invite" : ""
    "Organization" o{--}o "Title" : ""
    "Organization" o{--}o "Unit" : ""
    "Organization" o{--}o "User" : ""
    "Unit" o|--|| "Organization" : "organization"
    "Unit" o|--|| "User" : "createdBy"
    "Unit" o{--}o "Deflection" : ""
    "Unit" o{--}o "Incident" : ""
    "Unit" o{--}o "User" : ""
    "Title" o|--|| "Organization" : "organization"
    "Title" o|--|| "User" : "createdBy"
    "Title" o{--}o "Deflection" : ""
    "Title" o{--}o "Incident" : ""
    "Title" o{--}o "Invite" : ""
    "Title" o{--}o "User" : ""
    "User" o|--}o "RoleEnum" : "enum:roles"
    "User" o|--|o "Organization" : "organization"
    "User" o|--|o "Title" : "title"
    "User" o|--|o "Unit" : "unit"
    "User" o{--}o "BedType" : ""
    "User" o{--}o "BedType" : ""
    "User" o{--}o "BedTypeUpdate" : ""
    "User" o{--}o "DeflectionCancelReason" : ""
    "User" o{--}o "DeflectionCancelReason" : ""
    "User" o{--}o "DeflectionDetailCategory" : ""
    "User" o{--}o "DeflectionDetailCategory" : ""
    "User" o{--}o "DeflectionDetail" : ""
    "User" o{--}o "DeflectionDetail" : ""
    "User" o{--}o "DeflectionReleaseReason" : ""
    "User" o{--}o "DeflectionReleaseReason" : ""
    "User" o{--}o "DeflectionRefusalReason" : ""
    "User" o{--}o "DeflectionRefusalReason" : ""
    "User" o{--}o "DeflectionExitDestination" : ""
    "User" o{--}o "DeflectionExitDestination" : ""
    "User" o{--}o "DeflectionExitHousingStatus" : ""
    "User" o{--}o "DeflectionExitHousingStatus" : ""
    "User" o{--}o "Deflection" : ""
    "User" o{--}o "Deflection" : ""
    "User" o{--}o "Deflection" : ""
    "User" o{--}o "Deflection" : ""
    "User" o{--}o "Deflection" : ""
    "User" o{--}o "Deflection" : ""
    "User" o{--}o "Deflection" : ""
    "User" o{--}o "DeflectionUpdate" : ""
    "User" o{--}o "Facility" : ""
    "User" o{--}o "Facility" : ""
    "User" o{--}o "FacilityStatusReason" : ""
    "User" o{--}o "FacilityStatusReason" : ""
    "User" o{--}o "FacilityUpdate" : ""
    "User" o{--}o "Incident" : ""
    "User" o{--}o "Incident" : ""
    "User" o{--}o "Invite" : ""
    "User" o{--}o "Invite" : ""
    "User" o{--}o "Invite" : ""
    "User" o{--}o "PropertyPhoto" : ""
    "User" o{--}o "PropertyPhoto" : ""
    "Invite" o|--|o "Organization" : "organization"
    "Invite" o|--|o "Title" : "title"
    "Invite" o|--|| "User" : "createdBy"
    "Invite" o|--|o "User" : "acceptedBy"
    "Invite" o|--|o "User" : "revokedBy"
    "Facility" o|--|| "FacilityTypeEnum" : "enum:type"
    "Facility" o|--|| "ServiceType" : "serviceType"
    "Facility" o|--|| "FacilityStatusEnum" : "enum:status"
    "Facility" o|--|o "FacilityStatusReason" : "statusReason"
    "Facility" o|--|| "FacilityUpdateMethodEnum" : "enum:updateMethod"
    "Facility" o|--|| "User" : "createdBy"
    "Facility" o|--|| "User" : "updatedBy"
    "Facility" o{--}o "Amenity" : ""
    "Facility" o{--}o "BedType" : ""
    "Facility" o{--}o "BedTypeUpdate" : ""
    "Facility" o{--}o "FacilityContact" : ""
    "Facility" o{--}o "Deflection" : ""
    "Facility" o{--}o "FacilityEligibility" : ""
    "Facility" o{--}o "Incident" : ""
    "Facility" o{--}o "FacilityUpdate" : ""
    "FacilityUpdate" o|--|| "Facility" : "facility"
    "FacilityUpdate" o|--|| "FacilityStatusEnum" : "enum:status"
    "FacilityUpdate" o|--|o "FacilityStatusReason" : "statusReason"
    "FacilityUpdate" o|--|| "FacilityUpdateMethodEnum" : "enum:updateMethod"
    "FacilityUpdate" o|--|| "User" : "updatedBy"
    "FacilityStatusReason" o|--|o "FacilityTypeEnum" : "enum:type"
    "FacilityStatusReason" o|--|| "User" : "createdBy"
    "FacilityStatusReason" o|--|| "User" : "updatedBy"
    "FacilityContact" o|--|| "Facility" : "facility"
    "BedType" o|--|| "Facility" : "facility"
    "BedType" o|--|| "BedTypeEnum" : "enum:type"
    "BedType" o|--|| "User" : "createdBy"
    "BedType" o|--|| "FacilityUpdateMethodEnum" : "enum:updateMethod"
    "BedType" o|--|| "User" : "updatedBy"
    "BedType" o{--}o "Deflection" : ""
    "BedType" o{--}o "BedTypeUpdate" : ""
    "BedTypeUpdate" o|--|| "BedType" : "bedType"
    "BedTypeUpdate" o|--|| "Facility" : "facility"
    "BedTypeUpdate" o|--|| "FacilityUpdateMethodEnum" : "enum:updateMethod"
    "BedTypeUpdate" o|--|| "User" : "updatedBy"
    "FacilityEligibility" o|--|| "Facility" : "facility"
    "FacilityEligibility" o|--|| "FacilityEligibilityTypeEnum" : "enum:type"
    "Subject" o|--|o "SexEnum" : "enum:sex"
    "Subject" o|--|o "RaceEnum" : "enum:race"
    "Subject" o{--}o "Deflection" : ""
    "Deflection" o|--|| "Facility" : "facility"
    "Deflection" o|--|| "Incident" : "incident"
    "Deflection" o|--|| "BedType" : "bedType"
    "Deflection" o|--|o "Subject" : "subject"
    "Deflection" o|--|| "SubjectStatusEnum" : "enum:subjectStatus"
    "Deflection" o|--|o "PropertyEnum" : "enum:property"
    "Deflection" o|--|| "User" : "createdBy"
    "Deflection" o|--|| "HoldStatusEnum" : "enum:status"
    "Deflection" o|--|o "DeflectionCancelReason" : "cancelReason"
    "Deflection" o|--|o "User" : "cancelledBy"
    "Deflection" o|--|o "User" : "transferredBy"
    "Deflection" o|--|o "Organization" : "transferredByOrganization"
    "Deflection" o|--|o "Unit" : "transferredByUnit"
    "Deflection" o|--|o "Title" : "transferredByTitle"
    "Deflection" o|--|o "User" : "admittedBy"
    "Deflection" o|--|o "User" : "rejectedBy"
    "Deflection" o|--|o "User" : "releasedBy"
    "Deflection" o|--|o "DeflectionReleaseReason" : "releaseReason"
    "Deflection" o|--|o "DeflectionRefusalReason" : "refusalReason"
    "Deflection" o|--|o "User" : "exitedBy"
    "Deflection" o|--|o "DeflectionExitDestination" : "exitDestination"
    "Deflection" o|--|o "DeflectionExitHousingStatus" : "exitHousingStatus"
    "Deflection" o|--|o "TernaryEnum" : "enum:exitConnectedToCare"
    "Deflection" o|--|o "TernaryEnum" : "enum:exitSFResident"
    "Deflection" o{--}o "DeflectionDetail" : ""
    "Deflection" o{--}o "DeflectionUpdate" : ""
    "Deflection" o{--}o "PropertyPhoto" : ""
    "DeflectionDetailCategory" o|--|| "User" : "createdBy"
    "DeflectionDetailCategory" o|--|o "User" : "updatedBy"
    "DeflectionDetailCategory" o{--}o "DeflectionDetail" : ""
    "DeflectionDetail" o|--|| "DeflectionDetailCategory" : "deflectionDetailCategory"
    "DeflectionDetail" o|--|| "User" : "createdBy"
    "DeflectionDetail" o|--|o "User" : "updatedBy"
    "DeflectionUpdate" o|--|| "Deflection" : "deflection"
    "DeflectionUpdate" o|--|o "HoldStatusEnum" : "enum:status"
    "DeflectionUpdate" o|--|o "DeflectionCancelReason" : "cancelReason"
    "DeflectionUpdate" o|--|o "SubjectStatusEnum" : "enum:subjectStatus"
    "DeflectionUpdate" o|--|o "DeflectionReleaseReason" : "releaseReason"
    "DeflectionUpdate" o|--|o "DeflectionRefusalReason" : "refusalReason"
    "DeflectionUpdate" o|--|o "DeflectionExitDestination" : "exitDestination"
    "DeflectionUpdate" o|--|o "DeflectionExitHousingStatus" : "exitHousingStatus"
    "DeflectionUpdate" o|--|o "TernaryEnum" : "enum:exitConnectedToCare"
    "DeflectionUpdate" o|--|o "TernaryEnum" : "enum:exitSFResident"
    "DeflectionUpdate" o|--|| "User" : "updatedBy"
    "DeflectionCancelReason" o|--|| "User" : "createdBy"
    "DeflectionCancelReason" o|--|| "User" : "updatedBy"
    "DeflectionReleaseReason" o|--|| "User" : "createdBy"
    "DeflectionReleaseReason" o|--|| "User" : "updatedBy"
    "DeflectionRefusalReason" o|--|| "User" : "createdBy"
    "DeflectionRefusalReason" o|--|| "User" : "updatedBy"
    "DeflectionExitDestination" o|--|| "User" : "createdBy"
    "DeflectionExitDestination" o|--|| "User" : "updatedBy"
    "DeflectionExitHousingStatus" o|--|| "User" : "createdBy"
    "DeflectionExitHousingStatus" o|--|| "User" : "updatedBy"
    "PropertyPhoto" o|--|| "Deflection" : "deflection"
    "PropertyPhoto" o|--|| "User" : "createdBy"
    "PropertyPhoto" o|--|| "User" : "updatedBy"
    "Incident" o|--|| "Facility" : "facility"
    "Incident" o|--|| "EncounteredViaEnum" : "enum:encounteredVia"
    "Incident" o|--|| "User" : "createdBy"
    "Incident" o|--|o "Organization" : "createdByOrganization"
    "Incident" o|--|o "Title" : "createdByTitle"
    "Incident" o|--|o "Unit" : "createdByUnit"
    "Incident" o|--|| "User" : "updatedBy"
```
