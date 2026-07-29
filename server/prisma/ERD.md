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
    


        SFResidentEnum {
            YES YES
NO NO
UNKNOWN UNKNOWN
DECLINED_CONSENT DECLINED_CONSENT
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
    


        PropertyNotReturnedReasonEnum {
            ABANDONED ABANDONED
DESTROYED DESTROYED
OTHER OTHER
        }
    


        ChargeTypeEnum {
            RWS_647F RWS_647F
HS_11550 HS_11550
        }
    


        DrugTypeEnum {
            ALCOHOL ALCOHOL
HEROIN HEROIN
FENTANYL FENTANYL
COCAINE COCAINE
METH METH
MEDS MEDS
OTHER OTHER
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
    


        PreferredLanguageEnum {
            ARABIC ARABIC
ARMENIAN ARMENIAN
BASQUE BASQUE
BOSNIAN BOSNIAN
CHINESE_CANTONESE CHINESE_CANTONESE
CHINESE_MANDARIN CHINESE_MANDARIN
DANISH DANISH
FIJIAN FIJIAN
FILIPINO_TAGALOG FILIPINO_TAGALOG
FRENCH FRENCH
GAELIC GAELIC
GERMAN GERMAN
GREEK GREEK
GUJARATI GUJARATI
HINDI HINDI
IGBO IGBO
ILONGGO ILONGGO
ITALIAN ITALIAN
JAPANESE JAPANESE
KOREAN KOREAN
LAOTIAN LAOTIAN
MANDARIN MANDARIN
POLISH POLISH
PORTUGUESE PORTUGUESE
PUNJABI PUNJABI
ROMANIAN ROMANIAN
RUSSIAN RUSSIAN
SAMOAN SAMOAN
SERBIAN SERBIAN
SPANISH SPANISH
SWEDISH SWEDISH
THAI THAI
TOISANESE TOISANESE
URDU URDU
VIETNAMESE VIETNAMESE
        }
    


        DeflectionCancelReasonEnum {
            BEHAVIORAL_HEALTH_EVALUATION BEHAVIORAL_HEALTH_EVALUATION
JAIL JAIL
HOSPITAL HOSPITAL
RELEASE_ON_SCENE RELEASE_ON_SCENE
NO_CHAIRS_AVAILABLE NO_CHAIRS_AVAILABLE
STAFFING_SHORTAGE STAFFING_SHORTAGE
        }
    


        DeflectionReleaseReasonEnum {
            SOBERED SOBERED
MEDICAL_ISSUE MEDICAL_ISSUE
BEHAVIORAL_HEALTH_EVALUATION BEHAVIORAL_HEALTH_EVALUATION
OTHER OTHER
DEATH_IN_FACILITY DEATH_IN_FACILITY
DEATH_IN_CUSTODY DEATH_IN_CUSTODY
        }
    


        DeflectionRefusalReasonEnum {
            AGGRESSIVE_BEHAVIOR AGGRESSIVE_BEHAVIOR
MEDICAL_ISSUE MEDICAL_ISSUE
        }
    


        DeflectionExitDestinationEnum {
            JAIL JAIL
HOSPITAL HOSPITAL
STREET STREET
HOME HOME
SERVICES_NON_HOSPITAL SERVICES_NON_HOSPITAL
DECLINED_CONSENT DECLINED_CONSENT
OTHER OTHER
        }
    


        DeflectionExitHousingStatusEnum {
            PERMANENT PERMANENT
SHELTERED SHELTERED
TEMPORARY TEMPORARY
UNKNOWN UNKNOWN
DECLINED_CONSENT DECLINED_CONSENT
        }
    


        FacilityStatusReasonEnum {
            BUILDING_ISSUE BUILDING_ISSUE
SAFETY_LOCKDOWN SAFETY_LOCKDOWN
OTHER OTHER
SFSO_STAFFING SFSO_STAFFING
CONNECTIONS_STAFFING CONNECTIONS_STAFFING
        }
    


        BedTypeUnavailableReasonEnum {
            SFSD_STAFFING SFSD_STAFFING
CONTRACTOR_STAFFING CONTRACTOR_STAFFING
BUILDING_ISSUE BUILDING_ISSUE
SAFETY_LOCKDOWN SAFETY_LOCKDOWN
OTHER OTHER
        }
    


        RoleEnum {
            FIELD FIELD
CUSTODY CUSTODY
CARE CARE
ORG_ADMIN ORG_ADMIN
FACILITY_ADMIN FACILITY_ADMIN
        }
    


        SubjectStatusEnum {
            DETAINED DETAINED
ONSITE_AWAITING_TRANSFER ONSITE_AWAITING_TRANSFER
AWAITING_INTAKE AWAITING_INTAKE
READY_FOR_INTAKE READY_FOR_INTAKE
FAILED_INTAKE FAILED_INTAKE
IN_MEDICAL_INTAKE IN_MEDICAL_INTAKE
IN_CHAIR IN_CHAIR
RELEASED RELEASED
EXITED EXITED
DEATH_IN_FACILITY DEATH_IN_FACILITY
DEATH_IN_CUSTODY DEATH_IN_CUSTODY
        }
    


        NotifiableEventEnum {
            NEW_HOLD NEW_HOLD
ARRIVAL ARRIVAL
EXIT EXIT
        }
    


        FacilityCheckInEventEnum {
            ARRIVAL ARRIVAL
DEPARTURE DEPARTURE
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
    DateTime deletedAt "❓"
    String passwordResetToken "❓"
    DateTime passwordResetExpiresAt "❓"
    Boolean mfaEnabled 
    String mfaCode "❓"
    String mfaToken "❓"
    DateTime mfaExpiresAt "❓"
    Int mfaAttempts 
    DateTime mfaLastSentAt "❓"
    String badgeNumber "❓"
    Boolean prop115Certified 
    DateTime satisfactionSurveyNextEligibleAt "❓"
    String phoneNumber "❓"
    DateTime phoneVerifiedAt "❓"
    DateTime smsConsentAt "❓"
    DateTime smsOptedOutAt "❓"
    Boolean notificationsEnabled 
    NotifiableEventEnum subscribedEvents 
    String currentFacilityId "❓"
    String smsOtpCode "❓"
    DateTime smsOtpExpiresAt "❓"
    Int smsOtpAttempts 
    DateTime smsOtpLastSentAt "❓"
    DateTime smsBannerDismissedAt "❓"
    DateTime smsBannerRemindAfter "❓"
    Int smsBannerRemindCount 
    DateTime smsWelcomedAt "❓"
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
    DateTime expiresAt "❓"
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
    FacilityStatusReasonEnum statusReason "❓"
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
    FacilityStatusReasonEnum statusReason "❓"
    String statusOther "❓"
    FacilityUpdateMethodEnum updateMethod 
    String updateNotes "❓"
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
  

  "AdminSecurityEvent" {
    String id "🗝️"
    String action 
    Json metadata "❓"
    String actorUserId 
    String targetUserId 
    DateTime createdAt 
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
    Int inTransit 
    Int available 
    DateTime createdAt 
    String createdById 
    BedTypeUnavailableReasonEnum unavailableReason "❓"
    String unavailableOther "❓"
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
    Int inTransit 
    Int available 
    BedTypeUnavailableReasonEnum unavailableReason "❓"
    String unavailableOther "❓"
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
    PreferredLanguageEnum preferredLanguage "❓"
    String addressLine1 "❓"
    String addressLine2 "❓"
    String city "❓"
    String state "❓"
    String postalCode "❓"
    String localId "❓"
    DateTime anonymizedAt "❓"
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
    Boolean drugUseEvidence "❓"
    DrugTypeEnum drugType "❓"
    String behavior "❓"
    String behaviorNarrative "❓"
    ChargeTypeEnum chargeType "❓"
    DateTime certifiedAt "❓"
    PropertyEnum property "❓"
    String propertyDetails "❓"
    PropertyNotReturnedReasonEnum propertyNotReturnedReason "❓"
    String propertyNotReturnedOtherReason "❓"
    Boolean propertyReturned "❓"
    DateTime propertyReturnedAt "❓"
    String propertyReturnedById "❓"
    String currentOfficerId "❓"
    DateTime createdAt 
    String createdById 
    DateTime expiresAt 
    DateTime completedAt "❓"
    HoldStatusEnum status 
    Int extensionCount 
    DeflectionCancelReasonEnum cancelReason "❓"
    DateTime cancelledAt "❓"
    String cancelledById "❓"
    DateTime transferredAt "❓"
    String transferredById "❓"
    String transferredByBadgeNumber "❓"
    Boolean transferredByProp115Certified "❓"
    String transferredByOrganizationId "❓"
    String transferredByUnitId "❓"
    String transferredByTitleId "❓"
    DateTime medicalIntakeStartedAt "❓"
    String medicalIntakeStartedById "❓"
    DateTime rejectedAt "❓"
    String rejectedById "❓"
    DateTime releasedAt "❓"
    String releasedById "❓"
    DeflectionReleaseReasonEnum releaseReason "❓"
    String otherReleaseReason "❓"
    String otherReleaseDestination "❓"
    String releaseNarrative "❓"
    DeflectionRefusalReasonEnum refusalReason "❓"
    DateTime exitedAt "❓"
    String exitedById "❓"
    DeflectionExitDestinationEnum exitDestination "❓"
    DeflectionExitHousingStatusEnum exitHousingStatus "❓"
    TernaryEnum exitConnectedToCare "❓"
    SFResidentEnum exitSFResident "❓"
    DateTime arrivedAt "❓"
    DateTime handoffReadyAt "❓"
    DateTime newHoldNotifiedAt "❓"
    DateTime updatedAt 
    }
  

  "DeflectionUpdate" {
    String id "🗝️"
    Int deflectionId 
    HoldStatusEnum status "❓"
    DateTime expiresAt "❓"
    Int extensionCount "❓"
    DeflectionCancelReasonEnum cancelReason "❓"
    SubjectStatusEnum subjectStatus "❓"
    DeflectionReleaseReasonEnum releaseReason "❓"
    String otherReleaseReason "❓"
    String otherReleaseDestination "❓"
    Boolean propertyReturned "❓"
    PropertyNotReturnedReasonEnum propertyNotReturnedReason "❓"
    String propertyNotReturnedOtherReason "❓"
    DeflectionRefusalReasonEnum refusalReason "❓"
    DeflectionExitDestinationEnum exitDestination "❓"
    DeflectionExitHousingStatusEnum exitHousingStatus "❓"
    TernaryEnum exitConnectedToCare "❓"
    SFResidentEnum exitSFResident "❓"
    DateTime updatedAt 
    String updatedById 
    }
  

  "DeflectionDocument" {
    String id "🗝️"
    Int deflectionId 
    String formId 
    String file "❓"
    String sourceDataHash "❓"
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
    }
  

  "SatisfactionSurvey" {
    String id "🗝️"
    String organizationId 
    String careConnectRating 
    String improvementSuggestions "❓"
    String resetFacilityFeedback "❓"
    DateTime createdAt 
    }
  

  "PropertyPhoto" {
    String id "🗝️"
    Int deflectionId 
    String file "❓"
    DateTime createdAt 
    String createdById 
    DateTime updatedAt 
    String updatedById 
    }
  

  "Incident" {
    Int id "🗝️"
    String facilityId "🗝️"
    String addressLine1 "❓"
    String addressLine2 "❓"
    String city "❓"
    String state "❓"
    String postalCode "❓"
    Decimal latitude "❓"
    Decimal longitude "❓"
    DateTime arrestedAt "❓"
    EncounteredViaEnum encounteredVia "❓"
    String cadNumber "❓"
    String caseNumber "❓"
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
  

  "FacilityCheckIn" {
    String id "🗝️"
    String userId 
    String facilityId 
    DateTime timestamp 
    FacilityCheckInEventEnum eventType 
    Int arrivedWithDeflectionIds 
    }
  

  "Handoff" {
    String id "🗝️"
    Int deflectionId 
    String fromOfficerId 
    String toOfficerId 
    DateTime timestamp 
    }
  
    "Organization" o|--}o "RoleEnum" : "enum:defaultRoles"
    "Organization" o|--|| "User" : "createdBy"
    "Organization" o{--}o "Deflection" : ""
    "Organization" o{--}o "Incident" : ""
    "Organization" o{--}o "Invite" : ""
    "Organization" o{--}o "Title" : ""
    "Organization" o{--}o "Unit" : ""
    "Organization" o{--}o "User" : ""
    "Organization" o{--}o "SatisfactionSurvey" : ""
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
    "User" o|--}o "NotifiableEventEnum" : "enum:subscribedEvents"
    "User" o|--|o "Facility" : "currentFacility"
    "User" o{--}o "AdminSecurityEvent" : ""
    "User" o{--}o "AdminSecurityEvent" : ""
    "User" o{--}o "BedType" : ""
    "User" o{--}o "BedType" : ""
    "User" o{--}o "BedTypeUpdate" : ""
    "User" o{--}o "Deflection" : ""
    "User" o{--}o "Deflection" : ""
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
    "User" o{--}o "FacilityUpdate" : ""
    "User" o{--}o "FacilityCheckIn" : ""
    "User" o{--}o "Handoff" : ""
    "User" o{--}o "Handoff" : ""
    "User" o{--}o "Incident" : ""
    "User" o{--}o "Incident" : ""
    "User" o{--}o "Invite" : ""
    "User" o{--}o "Invite" : ""
    "User" o{--}o "Invite" : ""
    "User" o{--}o "DeflectionDocument" : ""
    "User" o{--}o "DeflectionDocument" : ""
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
    "Facility" o|--|o "FacilityStatusReasonEnum" : "enum:statusReason"
    "Facility" o|--|| "FacilityUpdateMethodEnum" : "enum:updateMethod"
    "Facility" o|--|| "User" : "createdBy"
    "Facility" o|--|| "User" : "updatedBy"
    "Facility" o{--}o "Amenity" : ""
    "Facility" o{--}o "BedType" : ""
    "Facility" o{--}o "BedTypeUpdate" : ""
    "Facility" o{--}o "FacilityContact" : ""
    "Facility" o{--}o "Deflection" : ""
    "Facility" o{--}o "FacilityEligibility" : ""
    "Facility" o{--}o "FacilityCheckIn" : ""
    "Facility" o{--}o "Incident" : ""
    "Facility" o{--}o "FacilityUpdate" : ""
    "FacilityUpdate" o|--|| "Facility" : "facility"
    "FacilityUpdate" o|--|| "FacilityStatusEnum" : "enum:status"
    "FacilityUpdate" o|--|o "FacilityStatusReasonEnum" : "enum:statusReason"
    "FacilityUpdate" o|--|| "FacilityUpdateMethodEnum" : "enum:updateMethod"
    "FacilityUpdate" o|--|| "User" : "updatedBy"
    "FacilityContact" o|--|| "Facility" : "facility"
    "AdminSecurityEvent" o|--|| "User" : "actor"
    "AdminSecurityEvent" o|--|| "User" : "target"
    "BedType" o|--|| "Facility" : "facility"
    "BedType" o|--|| "BedTypeEnum" : "enum:type"
    "BedType" o|--|| "User" : "createdBy"
    "BedType" o|--|o "BedTypeUnavailableReasonEnum" : "enum:unavailableReason"
    "BedType" o|--|| "FacilityUpdateMethodEnum" : "enum:updateMethod"
    "BedType" o|--|| "User" : "updatedBy"
    "BedType" o{--}o "Deflection" : ""
    "BedType" o{--}o "BedTypeUpdate" : ""
    "BedTypeUpdate" o|--|| "BedType" : "bedType"
    "BedTypeUpdate" o|--|| "Facility" : "facility"
    "BedTypeUpdate" o|--|o "BedTypeUnavailableReasonEnum" : "enum:unavailableReason"
    "BedTypeUpdate" o|--|| "FacilityUpdateMethodEnum" : "enum:updateMethod"
    "BedTypeUpdate" o|--|| "User" : "updatedBy"
    "FacilityEligibility" o|--|| "Facility" : "facility"
    "FacilityEligibility" o|--|| "FacilityEligibilityTypeEnum" : "enum:type"
    "Subject" o|--|o "SexEnum" : "enum:sex"
    "Subject" o|--|o "RaceEnum" : "enum:race"
    "Subject" o|--|o "PreferredLanguageEnum" : "enum:preferredLanguage"
    "Subject" o{--}o "Deflection" : ""
    "Deflection" o|--|| "Facility" : "facility"
    "Deflection" o|--|| "Incident" : "incident"
    "Deflection" o|--|| "BedType" : "bedType"
    "Deflection" o|--|o "Subject" : "subject"
    "Deflection" o|--|| "SubjectStatusEnum" : "enum:subjectStatus"
    "Deflection" o|--|o "DrugTypeEnum" : "enum:drugType"
    "Deflection" o|--|o "ChargeTypeEnum" : "enum:chargeType"
    "Deflection" o|--|o "PropertyEnum" : "enum:property"
    "Deflection" o|--|o "PropertyNotReturnedReasonEnum" : "enum:propertyNotReturnedReason"
    "Deflection" o|--|o "User" : "propertyReturnedBy"
    "Deflection" o|--|o "User" : "currentOfficer"
    "Deflection" o|--|| "User" : "createdBy"
    "Deflection" o|--|| "HoldStatusEnum" : "enum:status"
    "Deflection" o|--|o "DeflectionCancelReasonEnum" : "enum:cancelReason"
    "Deflection" o|--|o "User" : "cancelledBy"
    "Deflection" o|--|o "User" : "transferredBy"
    "Deflection" o|--|o "Organization" : "transferredByOrganization"
    "Deflection" o|--|o "Unit" : "transferredByUnit"
    "Deflection" o|--|o "Title" : "transferredByTitle"
    "Deflection" o|--|o "User" : "medicalIntakeStartedBy"
    "Deflection" o|--|o "User" : "rejectedBy"
    "Deflection" o|--|o "User" : "releasedBy"
    "Deflection" o|--|o "DeflectionReleaseReasonEnum" : "enum:releaseReason"
    "Deflection" o|--|o "DeflectionRefusalReasonEnum" : "enum:refusalReason"
    "Deflection" o|--|o "User" : "exitedBy"
    "Deflection" o|--|o "DeflectionExitDestinationEnum" : "enum:exitDestination"
    "Deflection" o|--|o "DeflectionExitHousingStatusEnum" : "enum:exitHousingStatus"
    "Deflection" o|--|o "TernaryEnum" : "enum:exitConnectedToCare"
    "Deflection" o|--|o "SFResidentEnum" : "enum:exitSFResident"
    "Deflection" o{--}o "DeflectionUpdate" : ""
    "Deflection" o{--}o "DeflectionDocument" : ""
    "Deflection" o{--}o "PropertyPhoto" : ""
    "Deflection" o{--}o "Handoff" : ""
    "DeflectionUpdate" o|--|| "Deflection" : "deflection"
    "DeflectionUpdate" o|--|o "HoldStatusEnum" : "enum:status"
    "DeflectionUpdate" o|--|o "DeflectionCancelReasonEnum" : "enum:cancelReason"
    "DeflectionUpdate" o|--|o "SubjectStatusEnum" : "enum:subjectStatus"
    "DeflectionUpdate" o|--|o "DeflectionReleaseReasonEnum" : "enum:releaseReason"
    "DeflectionUpdate" o|--|o "PropertyNotReturnedReasonEnum" : "enum:propertyNotReturnedReason"
    "DeflectionUpdate" o|--|o "DeflectionRefusalReasonEnum" : "enum:refusalReason"
    "DeflectionUpdate" o|--|o "DeflectionExitDestinationEnum" : "enum:exitDestination"
    "DeflectionUpdate" o|--|o "DeflectionExitHousingStatusEnum" : "enum:exitHousingStatus"
    "DeflectionUpdate" o|--|o "TernaryEnum" : "enum:exitConnectedToCare"
    "DeflectionUpdate" o|--|o "SFResidentEnum" : "enum:exitSFResident"
    "DeflectionUpdate" o|--|| "User" : "updatedBy"
    "DeflectionDocument" o|--|| "Deflection" : "deflection"
    "DeflectionDocument" o|--|| "User" : "createdBy"
    "DeflectionDocument" o|--|| "User" : "updatedBy"
    "SatisfactionSurvey" o|--|| "Organization" : "organization"
    "PropertyPhoto" o|--|| "Deflection" : "deflection"
    "PropertyPhoto" o|--|| "User" : "createdBy"
    "PropertyPhoto" o|--|| "User" : "updatedBy"
    "Incident" o|--|| "Facility" : "facility"
    "Incident" o|--|o "EncounteredViaEnum" : "enum:encounteredVia"
    "Incident" o|--|| "User" : "createdBy"
    "Incident" o|--|o "Organization" : "createdByOrganization"
    "Incident" o|--|o "Title" : "createdByTitle"
    "Incident" o|--|o "Unit" : "createdByUnit"
    "Incident" o|--|| "User" : "updatedBy"
    "FacilityCheckIn" o|--|| "User" : "user"
    "FacilityCheckIn" o|--|| "Facility" : "facility"
    "FacilityCheckIn" o|--|| "FacilityCheckInEventEnum" : "enum:eventType"
    "Handoff" o|--|| "Deflection" : "deflection"
    "Handoff" o|--|| "User" : "fromOfficer"
    "Handoff" o|--|| "User" : "toOfficer"
```
