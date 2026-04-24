# Hotel Management Software - API Specification

## Overview

This document provides detailed API specifications for the Hotel Management Software. All APIs follow RESTful conventions and use JSON for request/response bodies.

## Base URL

```
Production: https://api.hotelmanager.com/v1
Development: http://localhost:3000/api
```

## Authentication

All API requests (except login) require authentication via JWT Bearer token.

```
Authorization: Bearer <token>
```

---

## 1. Authentication APIs

### 1.1 Login

**POST** `/auth/login`

Request:
```json
{
  "email": "admin@grandhotel.com",
  "password": "password123",
  "role": "admin" // "super-admin" | "admin" | "staff"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_123",
      "name": "John Manager",
      "email": "admin@grandhotel.com",
      "role": "admin",
      "hotelId": "htl_456",
      "hotelName": "Grand Hotel",
      "modules": ["front-office", "accounts", "housekeeping"]
    },
    "expiresAt": "2024-12-25T12:00:00Z"
  }
}
```

### 1.2 Refresh Token

**POST** `/auth/refresh`

Request:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 1.3 Logout

**POST** `/auth/logout`

### 1.4 Change Password

**POST** `/auth/change-password`

Request:
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

---

## 2. Super Admin APIs

### 2.1 Hotels

#### List All Hotels

**GET** `/super-admin/hotels`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |
| search | string | Search by name, city, email |
| status | string | Filter by status: active, inactive, suspended |
| country | string | Filter by country |

Response:
```json
{
  "success": true,
  "data": {
    "hotels": [
      {
        "id": "htl_456",
        "name": "Grand Hotel",
        "address": "123 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "zipCode": "400001",
        "phone": "+91 22 12345678",
        "email": "info@grandhotel.com",
        "website": "https://grandhotel.com",
        "totalRooms": 120,
        "status": "active",
        "modules": ["front-office", "pos", "housekeeping", "accounts"],
        "subscription": {
          "plan": "enterprise",
          "validUntil": "2025-12-31"
        },
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

#### Create Hotel

**POST** `/super-admin/hotels`

Request:
```json
{
  "name": "Grand Hotel",
  "address": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "country": "India",
  "zipCode": "400001",
  "phone": "+91 22 12345678",
  "email": "info@grandhotel.com",
  "website": "https://grandhotel.com",
  "totalRooms": 120,
  "modules": ["front-office", "pos", "housekeeping", "accounts"],
  "adminUser": {
    "name": "Hotel Admin",
    "email": "admin@grandhotel.com",
    "password": "securepassword123",
    "phone": "+91 9876543210"
  },
  "subscription": {
    "plan": "enterprise",
    "validUntil": "2025-12-31"
  }
}
```

#### Get Hotel Details

**GET** `/super-admin/hotels/:hotelId`

#### Update Hotel

**PUT** `/super-admin/hotels/:hotelId`

#### Delete Hotel

**DELETE** `/super-admin/hotels/:hotelId`

#### Update Hotel Modules

**PATCH** `/super-admin/hotels/:hotelId/modules`

Request:
```json
{
  "modules": ["front-office", "pos", "housekeeping", "accounts", "reports"]
}
```

#### Suspend/Activate Hotel

**PATCH** `/super-admin/hotels/:hotelId/status`

Request:
```json
{
  "status": "suspended", // "active" | "suspended" | "inactive"
  "reason": "Payment overdue"
}
```

---

## 3. Hotel Admin APIs

### 3.1 Staff Management

#### List Staff

**GET** `/admin/staff`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| search | string | Search by name, email |
| role | string | Filter by role |
| status | string | active, inactive |

Response:
```json
{
  "success": true,
  "data": {
    "staff": [
      {
        "id": "stf_789",
        "name": "Sarah Receptionist",
        "email": "sarah@grandhotel.com",
        "phone": "+91 9876543210",
        "role": "receptionist",
        "department": "front-office",
        "modules": ["front-office"],
        "status": "active",
        "lastLogin": "2024-12-20T09:00:00Z",
        "createdAt": "2024-06-01T10:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### Create Staff

**POST** `/admin/staff`

Request:
```json
{
  "name": "Sarah Receptionist",
  "email": "sarah@grandhotel.com",
  "phone": "+91 9876543210",
  "password": "staffpassword123",
  "role": "receptionist",
  "department": "front-office",
  "modules": ["front-office"],
  "permissions": {
    "canCheckIn": true,
    "canCheckOut": true,
    "canModifyReservation": true,
    "canProcessPayment": true,
    "canViewReports": false,
    "canManageRooms": false
  }
}
```

#### Update Staff

**PUT** `/admin/staff/:staffId`

#### Delete Staff

**DELETE** `/admin/staff/:staffId`

#### Reset Staff Password

**POST** `/admin/staff/:staffId/reset-password`

---

## 4. Front Office APIs

### 4.1 Room Configuration

#### Get All Floors

**GET** `/front-office/floors`

Response:
```json
{
  "success": true,
  "data": {
    "floors": [
      {
        "id": "flr_001",
        "name": "Ground Floor",
        "floorNumber": 0,
        "totalRooms": 15,
        "roomConfigurations": [
          {
            "roomTypeId": "rt_001",
            "roomTypeName": "Deluxe",
            "count": 10,
            "startingRoomNumber": "G01",
            "rooms": ["G01", "G02", "G03", ...]
          },
          {
            "roomTypeId": "rt_002",
            "roomTypeName": "Super Deluxe",
            "count": 5,
            "startingRoomNumber": "G11",
            "rooms": ["G11", "G12", "G13", "G14", "G15"]
          }
        ]
      }
    ]
  }
}
```

#### Create Floor

**POST** `/front-office/floors`

Request:
```json
{
  "name": "First Floor",
  "floorNumber": 1
}
```

#### Add Room Configuration to Floor

**POST** `/front-office/floors/:floorId/room-config`

Request:
```json
{
  "roomTypeId": "rt_001",
  "count": 10,
  "startingRoomNumber": "101",
  "roomNumberFormat": "numeric" // "numeric" | "alphanumeric"
}
```

### 4.2 Room Types

#### List Room Types

**GET** `/front-office/room-types`

Response:
```json
{
  "success": true,
  "data": {
    "roomTypes": [
      {
        "id": "rt_001",
        "name": "Deluxe",
        "code": "DLX",
        "description": "Spacious room with city view",
        "baseRate": 5000,
        "maxOccupancy": {
          "adults": 2,
          "children": 1
        },
        "amenities": ["AC", "TV", "WiFi", "Mini Bar"],
        "bedType": "King",
        "roomSize": "350 sq ft",
        "images": ["url1", "url2"],
        "status": "active"
      }
    ]
  }
}
```

#### Create Room Type

**POST** `/front-office/room-types`

Request:
```json
{
  "name": "Premium Suite",
  "code": "PRM",
  "description": "Luxury suite with panoramic view",
  "baseRate": 15000,
  "maxOccupancy": {
    "adults": 3,
    "children": 2
  },
  "amenities": ["AC", "TV", "WiFi", "Mini Bar", "Jacuzzi", "Balcony"],
  "bedType": "King",
  "roomSize": "650 sq ft",
  "extraBedRate": 1500,
  "childRate": 500
}
```

### 4.3 Rate Plans

#### List Rate Plans

**GET** `/front-office/rate-plans`

Response:
```json
{
  "success": true,
  "data": {
    "ratePlans": [
      {
        "id": "rp_001",
        "name": "Rack Rate",
        "code": "RACK",
        "description": "Standard published rate",
        "isDefault": true,
        "rates": [
          {
            "roomTypeId": "rt_001",
            "singleOccupancy": 4500,
            "doubleOccupancy": 5000,
            "tripleOccupancy": 5500,
            "extraAdult": 1000,
            "extraChild": 500
          }
        ],
        "inclusions": ["Breakfast", "WiFi"],
        "validFrom": "2024-01-01",
        "validTo": "2024-12-31",
        "status": "active"
      }
    ]
  }
}
```

#### Create Rate Plan

**POST** `/front-office/rate-plans`

### 4.4 Rooms

#### List All Rooms

**GET** `/front-office/rooms`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| floor | string | Filter by floor ID |
| roomType | string | Filter by room type ID |
| status | string | available, occupied, reserved, maintenance, cleaning, blocked |
| search | string | Search by room number |

Response:
```json
{
  "success": true,
  "data": {
    "rooms": [
      {
        "id": "rm_001",
        "roomNumber": "101",
        "floorId": "flr_001",
        "floorName": "First Floor",
        "roomTypeId": "rt_001",
        "roomTypeName": "Deluxe",
        "status": "occupied",
        "cleaningStatus": "clean", // "clean" | "dirty" | "inspected"
        "currentGuest": {
          "id": "gst_123",
          "name": "John Doe",
          "checkInDate": "2024-12-18",
          "checkOutDate": "2024-12-22",
          "bookingId": "BK-123456"
        },
        "features": ["Sea View", "Balcony"],
        "lastCleaned": "2024-12-18T10:00:00Z"
      }
    ],
    "summary": {
      "total": 120,
      "available": 45,
      "occupied": 60,
      "reserved": 8,
      "maintenance": 4,
      "cleaning": 3,
      "blocked": 0
    }
  }
}
```

#### Get Room Details

**GET** `/front-office/rooms/:roomId`

#### Update Room Status

**PATCH** `/front-office/rooms/:roomId/status`

Request:
```json
{
  "status": "maintenance",
  "reason": "AC repair required",
  "expectedAvailability": "2024-12-20"
}
```

#### Block Room

**POST** `/front-office/rooms/:roomId/block`

Request:
```json
{
  "fromDate": "2024-12-20",
  "toDate": "2024-12-25",
  "reason": "VIP reservation hold",
  "blockedBy": "Management"
}
```

#### Unblock Room

**DELETE** `/front-office/rooms/:roomId/block`

---

### 4.5 Reservations

#### List Reservations

**GET** `/front-office/reservations`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| status | string | confirmed, checked-in, checked-out, cancelled, no-show |
| fromDate | date | Filter by check-in date from |
| toDate | date | Filter by check-in date to |
| guestName | string | Search by guest name |
| bookingId | string | Search by booking ID |
| source | string | Filter by booking source |

Response:
```json
{
  "success": true,
  "data": {
    "reservations": [
      {
        "id": "res_001",
        "bookingId": "BK-366080",
        "status": "confirmed",
        "guest": {
          "id": "gst_123",
          "title": "Mr",
          "name": "John Doe",
          "email": "john@email.com",
          "phone": "+91 9876543210",
          "nationality": "Indian",
          "idType": "Passport",
          "idNumber": "A1234567"
        },
        "room": {
          "id": "rm_001",
          "roomNumber": "101",
          "roomType": "Deluxe",
          "floor": "First Floor"
        },
        "dates": {
          "checkIn": "2024-12-20",
          "checkOut": "2024-12-25",
          "nights": 5
        },
        "occupancy": {
          "adults": 2,
          "children": 1
        },
        "ratePlan": {
          "id": "rp_001",
          "name": "Rack Rate",
          "roomRate": 5000,
          "totalRoomCharges": 25000,
          "taxes": 4500,
          "totalAmount": 29500
        },
        "advance": {
          "amount": 10000,
          "paymentMode": "Card",
          "transactionId": "TXN123456",
          "paidAt": "2024-12-15T10:00:00Z"
        },
        "source": "Direct",
        "specialRequests": "High floor, non-smoking room",
        "createdAt": "2024-12-15T09:30:00Z",
        "createdBy": "staff_001"
      }
    ],
    "pagination": {...}
  }
}
```

#### Create Reservation

**POST** `/front-office/reservations`

Request:
```json
{
  "guest": {
    "title": "Mr",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@email.com",
    "phone": "+91 9876543210",
    "alternatePhone": "+91 9876543211",
    "dateOfBirth": "1985-05-15",
    "gender": "Male",
    "nationality": "Indian",
    "address": {
      "street": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India",
      "zipCode": "400001"
    },
    "idProof": {
      "type": "Passport",
      "number": "A1234567",
      "issuedBy": "India",
      "expiryDate": "2030-05-15"
    },
    "gstDetails": {
      "gstNumber": "27AABCU9603R1ZM",
      "companyName": "ABC Corp",
      "companyAddress": "456 Business Park"
    }
  },
  "booking": {
    "checkInDate": "2024-12-20",
    "checkOutDate": "2024-12-25",
    "roomTypeId": "rt_001",
    "roomId": "rm_001", // Optional - specific room assignment
    "ratePlanId": "rp_001",
    "adults": 2,
    "children": 1,
    "childAges": [8],
    "extraBed": false
  },
  "billing": {
    "paymentMode": "Card",
    "advanceAmount": 10000,
    "transactionId": "TXN123456"
  },
  "source": "Direct", // "Direct" | "OTA" | "Corporate" | "Travel Agent" | "Walk-in"
  "sourceDetails": {
    "agentId": "agent_001", // If source is Travel Agent
    "corporateId": "corp_001", // If source is Corporate
    "otaName": "Booking.com", // If source is OTA
    "otaBookingId": "OTA123456"
  },
  "purposeOfVisit": "Business",
  "specialRequests": "High floor, non-smoking room",
  "marketSegment": "Corporate",
  "guestClassification": "VIP"
}
```

#### Get Reservation Details

**GET** `/front-office/reservations/:reservationId`

#### Update Reservation

**PUT** `/front-office/reservations/:reservationId`

#### Cancel Reservation

**POST** `/front-office/reservations/:reservationId/cancel`

Request:
```json
{
  "reason": "Guest requested cancellation",
  "cancellationCharge": 2000,
  "refundAmount": 8000,
  "refundMode": "Original Payment Method"
}
```

---

### 4.6 Check-In

#### Process Check-In

**POST** `/front-office/check-in`

Request:
```json
{
  "reservationId": "res_001",
  "roomId": "rm_001",
  "actualCheckInTime": "2024-12-20T14:30:00Z",
  "guestVerification": {
    "idVerified": true,
    "photoUploaded": true,
    "signatureCollected": true
  },
  "additionalGuests": [
    {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "idType": "Aadhaar",
      "idNumber": "1234-5678-9012"
    }
  ],
  "vehicleDetails": {
    "vehicleNumber": "MH01AB1234",
    "vehicleType": "Car",
    "parkingRequired": true
  },
  "additionalServices": ["Airport Pickup", "Newspaper"],
  "specialInstructions": "Guest is allergic to peanuts",
  "keyCardsIssued": 2
}
```

Response:
```json
{
  "success": true,
  "data": {
    "checkInId": "ci_001",
    "bookingId": "BK-366080",
    "roomNumber": "101",
    "guestName": "John Doe",
    "checkInTime": "2024-12-20T14:30:00Z",
    "expectedCheckOut": "2024-12-25T11:00:00Z",
    "grCardNumber": "GR-2024-001234",
    "folioNumber": "FO-2024-001234"
  }
}
```

#### Express Check-In

**POST** `/front-office/check-in/express`

Request:
```json
{
  "reservationId": "res_001",
  "quickVerification": true,
  "skipPhotoCapture": true
}
```

#### PAX (Additional Guest) Check-In

**POST** `/front-office/check-in/:checkInId/pax`

Request:
```json
{
  "guests": [
    {
      "name": "Jane Doe",
      "relationship": "Spouse",
      "gender": "Female",
      "dateOfBirth": "1988-08-20",
      "nationality": "Indian",
      "idType": "Aadhaar",
      "idNumber": "1234-5678-9012",
      "phone": "+91 9876543211"
    }
  ]
}
```

---

### 4.7 In-House Operations

#### Get In-House Guests

**GET** `/front-office/in-house`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| floor | string | Filter by floor |
| roomType | string | Filter by room type |
| checkingOutToday | boolean | Filter guests checking out today |
| vipOnly | boolean | Filter VIP guests only |

Response:
```json
{
  "success": true,
  "data": {
    "guests": [
      {
        "folioId": "fo_001",
        "bookingId": "BK-366080",
        "roomNumber": "101",
        "guestName": "John Doe",
        "paxCount": 2,
        "checkInDate": "2024-12-18",
        "checkOutDate": "2024-12-22",
        "nights": 4,
        "nightsStayed": 2,
        "nightsRemaining": 2,
        "roomRate": 5000,
        "totalCharges": 12500,
        "payments": 10000,
        "balance": 2500,
        "classification": "VIP",
        "specialRequests": "Late checkout requested"
      }
    ],
    "summary": {
      "totalGuests": 65,
      "totalPax": 142,
      "checkingOutToday": 12,
      "arrivingToday": 8,
      "vipGuests": 5
    }
  }
}
```

#### Shift Room

**POST** `/front-office/in-house/:folioId/shift-room`

Request:
```json
{
  "newRoomId": "rm_105",
  "reason": "Guest requested upgrade",
  "rateDifference": 1000,
  "chargeToGuest": true,
  "effectiveFrom": "2024-12-20T15:00:00Z"
}
```

#### Post Services/Charges

**POST** `/front-office/in-house/:folioId/charges`

Request:
```json
{
  "charges": [
    {
      "serviceCode": "SRV001",
      "serviceName": "Room Service - Breakfast",
      "quantity": 2,
      "unitPrice": 500,
      "amount": 1000,
      "taxRate": 18,
      "taxAmount": 180,
      "totalAmount": 1180
    },
    {
      "serviceCode": "SRV002",
      "serviceName": "Laundry",
      "quantity": 1,
      "unitPrice": 350,
      "amount": 350,
      "taxRate": 18,
      "taxAmount": 63,
      "totalAmount": 413
    }
  ],
  "remarks": "Charged as per guest request"
}
```

#### Post Room Tariff

**POST** `/front-office/in-house/:folioId/room-tariff`

Request:
```json
{
  "date": "2024-12-20",
  "roomRate": 5000,
  "taxes": {
    "cgst": 450,
    "sgst": 450
  },
  "totalAmount": 5900,
  "remarks": "Regular room tariff"
}
```

#### Collect Payment (Room Advance)

**POST** `/front-office/in-house/:folioId/payment`

Request:
```json
{
  "amount": 5000,
  "paymentMode": "Card", // "Cash" | "Card" | "UPI" | "Bank Transfer" | "Cheque"
  "paymentDetails": {
    "cardType": "Visa",
    "cardLastFour": "1234",
    "transactionId": "TXN789012",
    "approvalCode": "APP456"
  },
  "receiptNumber": "RCP-2024-001234",
  "remarks": "Additional advance collected"
}
```

#### Extend Stay

**POST** `/front-office/in-house/:folioId/extend`

Request:
```json
{
  "newCheckOutDate": "2024-12-27",
  "reason": "Guest extended stay",
  "additionalNights": 2,
  "rateForExtension": 5000,
  "approvedBy": "Manager"
}
```

#### Room Link (Master Folio)

**POST** `/front-office/in-house/link-rooms`

Request:
```json
{
  "masterFolioId": "fo_001",
  "linkedFolioIds": ["fo_002", "fo_003"],
  "billingInstructions": "All charges to master folio",
  "linkType": "Full" // "Full" | "RoomOnly" | "Extras Only"
}
```

#### Unlink Rooms

**DELETE** `/front-office/in-house/link-rooms/:masterFolioId`

Request:
```json
{
  "folioIdsToUnlink": ["fo_002"],
  "settleBefore": true
}
```

---

### 4.8 Check-Out & Settlement

#### Get Folio/Bill

**GET** `/front-office/folio/:folioId`

Response:
```json
{
  "success": true,
  "data": {
    "folio": {
      "folioId": "fo_001",
      "folioNumber": "FO-2024-001234",
      "bookingId": "BK-366080",
      "guest": {
        "name": "John Doe",
        "email": "john@email.com",
        "phone": "+91 9876543210",
        "gstNumber": "27AABCU9603R1ZM",
        "companyName": "ABC Corp"
      },
      "room": {
        "roomNumber": "101",
        "roomType": "Deluxe"
      },
      "stay": {
        "checkIn": "2024-12-18T14:30:00Z",
        "checkOut": "2024-12-22T11:00:00Z",
        "nights": 4
      },
      "charges": [
        {
          "id": "chg_001",
          "date": "2024-12-18",
          "description": "Room Charges - Deluxe",
          "quantity": 1,
          "rate": 5000,
          "amount": 5000,
          "cgst": 450,
          "sgst": 450,
          "total": 5900,
          "category": "Room"
        },
        {
          "id": "chg_002",
          "date": "2024-12-19",
          "description": "Room Service - Dinner",
          "quantity": 1,
          "rate": 1200,
          "amount": 1200,
          "cgst": 108,
          "sgst": 108,
          "total": 1416,
          "category": "F&B"
        }
      ],
      "payments": [
        {
          "id": "pmt_001",
          "date": "2024-12-15T10:00:00Z",
          "amount": 10000,
          "mode": "Card",
          "reference": "TXN123456",
          "receiptNumber": "RCP-2024-001230"
        }
      ],
      "summary": {
        "totalRoomCharges": 23600,
        "totalOtherCharges": 4248,
        "totalCharges": 27848,
        "totalTax": 4494,
        "grossTotal": 32342,
        "discount": 0,
        "netTotal": 32342,
        "totalPayments": 10000,
        "balance": 22342
      }
    }
  }
}
```

#### Apply Discount

**POST** `/front-office/folio/:folioId/discount`

Request:
```json
{
  "discountType": "Percentage", // "Percentage" | "Flat"
  "discountValue": 10,
  "appliedOn": "RoomCharges", // "RoomCharges" | "TotalBill" | "SpecificCharge"
  "chargeId": null, // Required if appliedOn is "SpecificCharge"
  "reason": "Corporate discount",
  "approvedBy": "Manager"
}
```

#### Process Settlement/Payment

**POST** `/front-office/folio/:folioId/settle`

Request:
```json
{
  "payments": [
    {
      "amount": 15000,
      "mode": "Card",
      "cardType": "Visa",
      "cardLastFour": "5678",
      "transactionId": "TXN456789"
    },
    {
      "amount": 7342,
      "mode": "Cash"
    }
  ],
  "settlementType": "Full", // "Full" | "Partial"
  "remarks": "Final settlement at checkout"
}
```

#### Process Check-Out

**POST** `/front-office/check-out`

Request:
```json
{
  "folioId": "fo_001",
  "actualCheckOutTime": "2024-12-22T10:45:00Z",
  "settlementComplete": true,
  "keyCardsReturned": 2,
  "minibarChecked": true,
  "minibarCharges": 500,
  "roomInspected": true,
  "damageCharges": 0,
  "guestFeedback": {
    "rating": 4,
    "comments": "Great stay, will come back!"
  },
  "invoiceRequired": true,
  "emailInvoice": true
}
```

Response:
```json
{
  "success": true,
  "data": {
    "checkOutId": "co_001",
    "bookingId": "BK-366080",
    "invoiceNumber": "INV-2024-001234",
    "invoiceUrl": "https://api.hotelmanager.com/invoices/INV-2024-001234.pdf",
    "checkOutTime": "2024-12-22T10:45:00Z",
    "finalBillAmount": 32842,
    "amountPaid": 32842,
    "balance": 0
  }
}
```

#### Paidout/Refund

**POST** `/front-office/folio/:folioId/paidout`

Request:
```json
{
  "type": "Refund", // "Paidout" | "Refund"
  "amount": 2000,
  "reason": "Overcharged for service",
  "paymentMode": "Cash",
  "approvedBy": "Manager",
  "remarks": "Refund processed as per guest complaint"
}
```

---

### 4.9 Guest Complaints

#### Create Complaint

**POST** `/front-office/complaints`

Request:
```json
{
  "folioId": "fo_001",
  "guestName": "John Doe",
  "roomNumber": "101",
  "category": "Housekeeping", // "Housekeeping" | "Maintenance" | "F&B" | "Staff" | "Noise" | "Other"
  "priority": "High", // "Low" | "Medium" | "High" | "Critical"
  "subject": "AC not working properly",
  "description": "The AC in room 101 is making noise and not cooling effectively",
  "reportedAt": "2024-12-20T16:30:00Z",
  "reportedTo": "Front Desk"
}
```

#### Update Complaint Status

**PATCH** `/front-office/complaints/:complaintId`

Request:
```json
{
  "status": "Resolved", // "Open" | "In Progress" | "Resolved" | "Closed"
  "resolution": "AC compressor replaced, guest satisfied",
  "resolvedBy": "Maintenance Team",
  "resolvedAt": "2024-12-20T18:00:00Z",
  "compensationProvided": "Complimentary dinner"
}
```

#### List Complaints

**GET** `/front-office/complaints`

---

### 4.10 Offers & Communication

#### Send Offer to Guest

**POST** `/front-office/offers/send`

Request:
```json
{
  "targetType": "Specific", // "Specific" | "InHouse" | "PastGuests" | "Upcoming"
  "guestIds": ["gst_001", "gst_002"],
  "channel": "Both", // "Email" | "SMS" | "Both"
  "offer": {
    "title": "Weekend Special Offer",
    "description": "Get 20% off on your next stay",
    "discountType": "Percentage",
    "discountValue": 20,
    "validFrom": "2024-12-20",
    "validTo": "2024-12-31",
    "promoCode": "WEEKEND20",
    "termsAndConditions": "Valid on direct bookings only"
  }
}
```

---

### 4.11 Night Audit

#### Run Night Audit

**POST** `/front-office/night-audit/run`

Request:
```json
{
  "auditDate": "2024-12-20",
  "tasks": {
    "postRoomCharges": true,
    "verifyOccupancy": true,
    "checkNoShows": true,
    "rolloverDate": true,
    "generateReports": true
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "auditId": "na_001",
    "auditDate": "2024-12-20",
    "status": "Completed",
    "summary": {
      "roomsOccupied": 85,
      "occupancyRate": 70.83,
      "totalRoomRevenue": 425000,
      "totalOtherRevenue": 45000,
      "totalRevenue": 470000,
      "arrivals": 12,
      "departures": 8,
      "noShows": 2,
      "cancellations": 1,
      "walkIns": 3,
      "roomChargesPosted": 85,
      "discrepancies": 0
    },
    "reports": {
      "dailyRevenueReport": "url",
      "occupancyReport": "url",
      "managerReport": "url"
    },
    "completedAt": "2024-12-21T02:30:00Z",
    "completedBy": "Night Auditor"
  }
}
```

---

## 5. Accounts APIs

### 5.1 Transactions

#### List Transactions

**GET** `/accounts/transactions`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| type | string | income, expense, transfer |
| category | string | Filter by category |
| fromDate | date | From date |
| toDate | date | To date |
| paymentMode | string | Cash, Card, UPI, Bank Transfer |

Response:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_001",
        "transactionNumber": "TXN-2024-001234",
        "date": "2024-12-20",
        "type": "Income",
        "category": "Room Revenue",
        "subCategory": "Room Rent",
        "description": "Room payment - BK-366080",
        "reference": "BK-366080",
        "debit": 0,
        "credit": 32342,
        "paymentMode": "Card",
        "ledgerAccount": "Room Revenue",
        "createdBy": "staff_001",
        "createdAt": "2024-12-20T10:45:00Z"
      }
    ],
    "summary": {
      "totalIncome": 450000,
      "totalExpense": 125000,
      "netAmount": 325000
    },
    "pagination": {...}
  }
}
```

#### Create Transaction

**POST** `/accounts/transactions`

Request:
```json
{
  "date": "2024-12-20",
  "type": "Expense",
  "category": "Utilities",
  "subCategory": "Electricity",
  "description": "Electricity bill - December 2024",
  "amount": 45000,
  "paymentMode": "Bank Transfer",
  "bankAccount": "HDFC Current Account",
  "reference": "ELEC-DEC-2024",
  "vendorId": "vnd_001",
  "attachments": ["receipt_url"],
  "ledgerAccount": "Utilities Expense"
}
```

### 5.2 Invoices

#### List Invoices

**GET** `/accounts/invoices`

#### Create Invoice

**POST** `/accounts/invoices`

Request:
```json
{
  "invoiceType": "Guest", // "Guest" | "Corporate" | "Agent" | "Vendor"
  "customerId": "gst_001",
  "bookingId": "BK-366080",
  "invoiceDate": "2024-12-22",
  "dueDate": "2024-12-29",
  "items": [
    {
      "description": "Room Charges - Deluxe (4 nights)",
      "sacCode": "996311",
      "quantity": 4,
      "rate": 5000,
      "amount": 20000,
      "cgstRate": 9,
      "cgstAmount": 1800,
      "sgstRate": 9,
      "sgstAmount": 1800,
      "total": 23600
    },
    {
      "description": "Food & Beverages",
      "sacCode": "996331",
      "quantity": 1,
      "rate": 3600,
      "amount": 3600,
      "cgstRate": 9,
      "cgstAmount": 324,
      "sgstRate": 9,
      "sgstAmount": 324,
      "total": 4248
    }
  ],
  "subtotal": 23600,
  "totalCgst": 2124,
  "totalSgst": 2124,
  "totalTax": 4248,
  "grandTotal": 27848,
  "amountPaid": 10000,
  "balanceDue": 17848,
  "notes": "Thank you for staying with us!",
  "termsAndConditions": "Payment due within 7 days"
}
```

#### Get Invoice

**GET** `/accounts/invoices/:invoiceId`

#### Send Invoice

**POST** `/accounts/invoices/:invoiceId/send`

Request:
```json
{
  "channel": "Email",
  "recipientEmail": "john@email.com",
  "cc": ["accounts@company.com"],
  "message": "Please find attached your invoice"
}
```

### 5.3 Receipts

#### Create Receipt

**POST** `/accounts/receipts`

Request:
```json
{
  "receiptType": "Payment", // "Payment" | "Advance" | "Refund"
  "customerId": "gst_001",
  "invoiceId": "inv_001",
  "amount": 17848,
  "paymentMode": "Card",
  "paymentDetails": {
    "cardType": "Visa",
    "cardLastFour": "5678",
    "transactionId": "TXN789012"
  },
  "receivedBy": "staff_001",
  "remarks": "Final payment received"
}
```

### 5.4 Payments (Outgoing)

#### List Payments

**GET** `/accounts/payments`

#### Create Payment

**POST** `/accounts/payments`

Request:
```json
{
  "paymentType": "Vendor", // "Vendor" | "Salary" | "Utility" | "Rent" | "Other"
  "vendorId": "vnd_001",
  "vendorName": "ABC Suppliers",
  "billNumber": "BILL-2024-001",
  "billDate": "2024-12-15",
  "amount": 25000,
  "paymentMode": "Bank Transfer",
  "bankAccount": "HDFC Current Account",
  "chequeNumber": null,
  "utrNumber": "UTR123456789",
  "paymentDate": "2024-12-20",
  "category": "Supplies",
  "description": "Kitchen supplies payment",
  "tdsApplicable": true,
  "tdsRate": 2,
  "tdsAmount": 500,
  "netPayment": 24500
}
```

### 5.5 Expenses

#### List Expenses

**GET** `/accounts/expenses`

#### Create Expense

**POST** `/accounts/expenses`

Request:
```json
{
  "date": "2024-12-20",
  "category": "Maintenance",
  "subCategory": "Repairs",
  "description": "AC repair in room 101",
  "amount": 5000,
  "paidTo": "XYZ Services",
  "paymentMode": "Cash",
  "billNumber": "XYZ-2024-001",
  "department": "Engineering",
  "approvedBy": "Manager",
  "attachments": ["receipt_url"]
}
```

### 5.6 Ledger

#### Get Chart of Accounts

**GET** `/accounts/ledger/chart-of-accounts`

Response:
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "acc_001",
        "code": "1000",
        "name": "Assets",
        "type": "Asset",
        "subAccounts": [
          {
            "id": "acc_002",
            "code": "1100",
            "name": "Current Assets",
            "subAccounts": [
              {
                "id": "acc_003",
                "code": "1101",
                "name": "Cash in Hand",
                "balance": 125000
              },
              {
                "id": "acc_004",
                "code": "1102",
                "name": "Bank - HDFC Current",
                "balance": 1250000
              }
            ]
          }
        ]
      },
      {
        "id": "acc_010",
        "code": "4000",
        "name": "Revenue",
        "type": "Income",
        "subAccounts": [
          {
            "id": "acc_011",
            "code": "4100",
            "name": "Room Revenue",
            "balance": 4500000
          },
          {
            "id": "acc_012",
            "code": "4200",
            "name": "F&B Revenue",
            "balance": 850000
          }
        ]
      }
    ]
  }
}
```

#### Get Ledger Entries

**GET** `/accounts/ledger/:accountId/entries`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| fromDate | date | From date |
| toDate | date | To date |

Response:
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "acc_003",
      "code": "1101",
      "name": "Cash in Hand"
    },
    "openingBalance": 100000,
    "entries": [
      {
        "date": "2024-12-20",
        "description": "Cash received - BK-366080",
        "reference": "RCP-2024-001234",
        "debit": 5000,
        "credit": 0,
        "balance": 105000
      },
      {
        "date": "2024-12-20",
        "description": "Petty cash expense",
        "reference": "EXP-2024-001234",
        "debit": 0,
        "credit": 1500,
        "balance": 103500
      }
    ],
    "closingBalance": 125000,
    "totalDebit": 45000,
    "totalCredit": 20000
  }
}
```

### 5.7 Day Book

#### Get Day Book

**GET** `/accounts/day-book`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| date | date | Date for day book |

Response:
```json
{
  "success": true,
  "data": {
    "date": "2024-12-20",
    "openingBalance": {
      "cash": 100000,
      "bank": 1200000
    },
    "receipts": [
      {
        "id": "rcp_001",
        "time": "09:30:00",
        "description": "Room payment - BK-366080",
        "mode": "Cash",
        "amount": 5000
      }
    ],
    "payments": [
      {
        "id": "pmt_001",
        "time": "11:00:00",
        "description": "Vegetable purchase",
        "mode": "Cash",
        "amount": 2500
      }
    ],
    "summary": {
      "totalReceipts": 125000,
      "totalPayments": 35000,
      "netCashFlow": 90000,
      "closingBalance": {
        "cash": 115000,
        "bank": 1275000
      }
    }
  }
}
```

### 5.8 Tax Reports

#### Get GST Report

**GET** `/accounts/tax-reports/gst`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| month | number | Month (1-12) |
| year | number | Year |

Response:
```json
{
  "success": true,
  "data": {
    "period": {
      "month": 12,
      "year": 2024
    },
    "outputTax": {
      "taxableValue": 4500000,
      "cgst": 405000,
      "sgst": 405000,
      "igst": 0,
      "totalTax": 810000
    },
    "inputTax": {
      "taxableValue": 1200000,
      "cgst": 108000,
      "sgst": 108000,
      "igst": 0,
      "totalTax": 216000
    },
    "netPayable": {
      "cgst": 297000,
      "sgst": 297000,
      "igst": 0,
      "total": 594000
    },
    "breakdown": {
      "roomRevenue": {
        "taxableValue": 3500000,
        "cgst": 315000,
        "sgst": 315000
      },
      "fbRevenue": {
        "taxableValue": 800000,
        "cgst": 72000,
        "sgst": 72000
      },
      "otherRevenue": {
        "taxableValue": 200000,
        "cgst": 18000,
        "sgst": 18000
      }
    }
  }
}
```

#### Get TDS Report

**GET** `/accounts/tax-reports/tds`

### 5.9 Financial Statements

#### Get Profit & Loss Statement

**GET** `/accounts/reports/profit-loss`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| fromDate | date | Period start |
| toDate | date | Period end |
| compareWithPrevious | boolean | Compare with previous period |

Response:
```json
{
  "success": true,
  "data": {
    "period": {
      "from": "2024-12-01",
      "to": "2024-12-31"
    },
    "revenue": {
      "roomRevenue": 4500000,
      "fbRevenue": 850000,
      "otherRevenue": 150000,
      "totalRevenue": 5500000
    },
    "expenses": {
      "salaries": 1200000,
      "utilities": 180000,
      "maintenance": 120000,
      "foodCost": 340000,
      "housekeeping": 85000,
      "marketing": 50000,
      "adminExpenses": 95000,
      "depreciation": 150000,
      "otherExpenses": 80000,
      "totalExpenses": 2300000
    },
    "grossProfit": 3200000,
    "operatingProfit": 3200000,
    "interestExpense": 100000,
    "profitBeforeTax": 3100000,
    "taxExpense": 775000,
    "netProfit": 2325000,
    "profitMargin": 42.27
  }
}
```

#### Get Balance Sheet

**GET** `/accounts/reports/balance-sheet`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| asOfDate | date | Balance sheet date |

Response:
```json
{
  "success": true,
  "data": {
    "asOfDate": "2024-12-31",
    "assets": {
      "currentAssets": {
        "cashAndBank": 1500000,
        "accountsReceivable": 450000,
        "inventory": 120000,
        "prepaidExpenses": 80000,
        "total": 2150000
      },
      "fixedAssets": {
        "property": 50000000,
        "furniture": 5000000,
        "equipment": 3000000,
        "vehicles": 1500000,
        "lessDepreciation": -8500000,
        "total": 51000000
      },
      "totalAssets": 53150000
    },
    "liabilities": {
      "currentLiabilities": {
        "accountsPayable": 350000,
        "advanceFromGuests": 280000,
        "taxPayable": 594000,
        "accruedExpenses": 150000,
        "total": 1374000
      },
      "longTermLiabilities": {
        "bankLoan": 20000000,
        "total": 20000000
      },
      "totalLiabilities": 21374000
    },
    "equity": {
      "paidUpCapital": 25000000,
      "reserves": 4000000,
      "retainedEarnings": 2776000,
      "totalEquity": 31776000
    },
    "totalLiabilitiesAndEquity": 53150000
  }
}
```

### 5.10 Account Settings

#### Get Tax Configuration

**GET** `/accounts/settings/tax`

#### Update Tax Configuration

**PUT** `/accounts/settings/tax`

Request:
```json
{
  "gstNumber": "27AABCU9603R1ZM",
  "gstRates": {
    "roomBelow7500": 12,
    "room7500AndAbove": 18,
    "foodAndBeverage": 5,
    "alcohol": 18,
    "otherServices": 18
  },
  "tdsRates": {
    "contractor": 2,
    "professional": 10,
    "rent": 10
  },
  "hsnCodes": {
    "roomRent": "996311",
    "foodAndBeverage": "996331",
    "laundry": "998312"
  }
}
```

#### Get Payment Methods

**GET** `/accounts/settings/payment-methods`

#### Update Payment Methods

**PUT** `/accounts/settings/payment-methods`

---

## 6. Reports APIs

### 6.1 Dashboard Stats

**GET** `/reports/dashboard`

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| date | date | Date for stats |

Response:
```json
{
  "success": true,
  "data": {
    "occupancy": {
      "totalRooms": 120,
      "occupied": 85,
      "available": 28,
      "outOfOrder": 4,
      "blocked": 3,
      "occupancyRate": 70.83
    },
    "arrivals": {
      "expected": 15,
      "checkedIn": 12,
      "pending": 3
    },
    "departures": {
      "expected": 10,
      "checkedOut": 8,
      "pending": 2
    },
    "revenue": {
      "todayRoom": 425000,
      "todayOther": 45000,
      "todayTotal": 470000,
      "mtdRoom": 12500000,
      "mtdTotal": 14200000
    },
    "collections": {
      "todayCash": 125000,
      "todayCard": 285000,
      "todayUPI": 60000,
      "todayTotal": 470000
    }
  }
}
```

### 6.2 Occupancy Report

**GET** `/reports/occupancy`

### 6.3 Revenue Report

**GET** `/reports/revenue`

### 6.4 Guest Report

**GET** `/reports/guests`

---

## 7. Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing authentication |
| FORBIDDEN | 403 | User doesn't have permission |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| CONFLICT | 409 | Resource conflict (e.g., duplicate) |
| INTERNAL_ERROR | 500 | Server error |

---

## 8. Webhooks (Optional)

### 8.1 Configure Webhook

**POST** `/webhooks`

Request:
```json
{
  "url": "https://your-server.com/webhook",
  "events": [
    "reservation.created",
    "reservation.cancelled",
    "checkin.completed",
    "checkout.completed",
    "payment.received"
  ],
  "secret": "your_webhook_secret"
}
```

### 8.2 Webhook Payload Example

```json
{
  "event": "checkin.completed",
  "timestamp": "2024-12-20T14:30:00Z",
  "data": {
    "bookingId": "BK-366080",
    "guestName": "John Doe",
    "roomNumber": "101",
    "checkInTime": "2024-12-20T14:30:00Z"
  },
  "signature": "sha256_hmac_signature"
}
```

---

## 9. Rate Limiting

- 100 requests per minute per API key
- 1000 requests per hour per API key
- Headers returned:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

---

## 10. Pagination

All list endpoints support pagination with these parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |

Response includes pagination info:
```json
{
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 11. Database Schema Reference

### Core Tables

```sql
-- Hotels
hotels (id, name, address, city, state, country, phone, email, status, created_at)

-- Users
users (id, hotel_id, name, email, password_hash, role, modules, status, last_login)

-- Room Types
room_types (id, hotel_id, name, code, base_rate, max_adults, max_children, amenities, status)

-- Floors
floors (id, hotel_id, name, floor_number)

-- Rooms
rooms (id, hotel_id, floor_id, room_type_id, room_number, status, cleaning_status)

-- Guests
guests (id, hotel_id, title, first_name, last_name, email, phone, nationality, id_type, id_number, address, gst_number)

-- Reservations
reservations (id, hotel_id, booking_id, guest_id, room_id, rate_plan_id, check_in, check_out, adults, children, status, source, total_amount, created_at)

-- Folios
folios (id, hotel_id, reservation_id, folio_number, guest_id, room_id, check_in, check_out, status)

-- Folio Charges
folio_charges (id, folio_id, charge_date, description, category, amount, tax_amount, total)

-- Folio Payments
folio_payments (id, folio_id, payment_date, amount, mode, reference, receipt_number)

-- Transactions
transactions (id, hotel_id, date, type, category, description, amount, payment_mode, ledger_account_id)

-- Ledger Accounts
ledger_accounts (id, hotel_id, code, name, type, parent_id, balance)
```

---

This API specification covers all the major functionality of the Hotel Management Software. Each endpoint should implement proper validation, authentication, and error handling as described above.
