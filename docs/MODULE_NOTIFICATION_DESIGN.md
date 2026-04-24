# Module, Notification, and Promotion Design

## Goal

Support a multi-hotel product where:

- Super Admin controls platform modules.
- Hotels subscribe to or request modules.
- Only hotel admin can request new modules.
- Staff cannot request modules.
- Super Admin can notify hotels about new modules, updates, maintenance, and policy changes.
- Hotels can notify their own guests about promotions and campaigns.

## Core Rule

Only users with role `hoteladmin` can create module requests.

Users with role `staff`:

- can view enabled modules for their hotel
- can view hotel notifications if permitted
- cannot request, approve, reject, enable, or disable modules

Users with role `superadmin`:

- manage module catalog
- approve or reject hotel module requests
- enable or disable modules for hotels
- send platform notifications to hotels

## Domain Separation

These must be separate subsystems:

1. Module catalog and entitlement
2. Module request workflow
3. Super Admin to Hotel notification system
4. Hotel to Guest promotion system
5. Notification delivery log

Do not mix them into one collection.

## Collections

### 1. modules

Platform master list of modules.

```js
{
  _id,
  code, // front-office, pos, housekeeping, accounts, reports
  name,
  description,
  category,
  isRequestable: true,
  isActive: true,
  createdBy,
  updatedBy,
  createdAt,
  updatedAt
}
```

Indexes:

- unique `{ code: 1 }`

### 2. hotelModuleSubscriptions

Actual module entitlement for a hotel.

```js
{
  _id,
  hotelId,
  moduleCode,
  status, // active, inactive, pending-activation, suspended
  billingPlan, // optional
  activationSource, // subscription, request-approved, trial, manual
  enabledBy, // superadmin user id
  enabledAt,
  disabledBy,
  disabledAt,
  notes,
  createdAt,
  updatedAt
}
```

Indexes:

- unique `{ hotelId: 1, moduleCode: 1 }`
- `{ hotelId: 1, status: 1 }`

### 3. moduleRequests

Request queue from hotel admin to Super Admin.

```js
{
  _id,
  hotelId,
  requestedModuleCode,
  status, // pending, approved, rejected, cancelled
  requestedBy, // must be hoteladmin
  reviewedBy, // superadmin
  requestedAt,
  reviewedAt,
  justification,
  adminNotes,
  createdAt,
  updatedAt
}
```

Rules:

- only `hoteladmin` can create records here
- `staff` cannot create or update
- duplicate pending request for same hotel + module should be blocked

Indexes:

- `{ hotelId: 1, requestedModuleCode: 1, status: 1 }`
- `{ status: 1, createdAt: -1 }`

### 4. adminNotifications

Platform notifications from Super Admin to hotels.

```js
{
  _id,
  title,
  message,
  type, // module-update, new-feature, maintenance, pricing, policy, general
  priority, // low, medium, high, critical
  audience,
  audienceDetails: {
    allHotels: false,
    hotelIds: [],
    moduleCodes: [],
    planCodes: []
  },
  relatedModuleCode,
  publishAt,
  expireAt,
  createdBy, // superadmin
  createdAt,
  updatedAt
}
```

### 5. hotelNotificationInbox

Materialized notification visibility per hotel/user.

```js
{
  _id,
  hotelId,
  notificationId,
  userId, // optional if per-user read tracking needed
  isRead: false,
  readAt,
  archived: false,
  createdAt,
  updatedAt
}
```

If you want hotel-level read status only, make `userId` optional and track per hotel.

### 6. promotionCampaigns

Hotel to guest promotional campaign.

```js
{
  _id,
  hotelId,
  title,
  description,
  channel, // email, sms, both, whatsapp
  targetType, // specific, in-house, past-guests, upcoming
  guestIds: [],
  audienceFilter: {
    fromDate,
    toDate,
    vipOnly,
    nationality,
    minVisits
  },
  offer: {
    discountType,
    discountValue,
    promoCode,
    validFrom,
    validTo,
    termsAndConditions
  },
  status, // draft, scheduled, sent, cancelled
  scheduledAt,
  sentAt,
  createdBy,
  createdAt,
  updatedAt
}
```

Rules:

- created by `hoteladmin`
- can optionally be allowed for selected staff later, but not required now

### 7. notificationDeliveries

Actual delivery log to hotel admins or hotel guests.

```js
{
  _id,
  hotelId,
  sourceType, // admin-notification, promotion-campaign, transactional
  sourceId,
  recipientType, // hotel-user, guest
  recipientId,
  recipientAddress,
  channel, // email, sms, whatsapp
  status, // queued, sent, delivered, failed
  provider,
  providerResponse,
  sentAt,
  deliveredAt,
  failedAt,
  errorMessage,
  createdAt,
  updatedAt
}
```

## Permissions Matrix

### Super Admin

Allowed:

- create/update/deactivate modules
- view all module requests
- approve/reject module requests
- enable/disable hotel modules
- create admin notifications
- view all campaign and delivery logs if needed

### Hotel Admin

Allowed:

- view enabled modules for their own hotel
- request a new module
- view request history for their own hotel
- view platform notifications for their hotel
- create guest promotion campaigns
- view campaign delivery logs for their hotel

### Staff

Allowed:

- view enabled modules available to their hotel
- view hotel notifications if you want user-level inbox
- not allowed to request modules
- not allowed to approve/reject module requests
- not allowed to manage platform notifications
- not allowed to create promotions unless explicitly granted later

## API Design

## A. Module Catalog and Hotel Entitlement

### Super Admin APIs

- `GET /super-admin/modules`
- `POST /super-admin/modules`
- `PUT /super-admin/modules/:moduleId`
- `PATCH /super-admin/modules/:moduleId/status`

- `GET /super-admin/hotels/:hotelId/modules`
- `PATCH /super-admin/hotels/:hotelId/modules/:moduleCode/enable`
- `PATCH /super-admin/hotels/:hotelId/modules/:moduleCode/disable`

### Hotel APIs

- `GET /admin/modules`
  - returns all modules visible to hotel and whether enabled/requestable/requested
- `GET /admin/modules/enabled`

## B. Module Request Workflow

### Hotel Admin APIs

- `POST /admin/module-requests`
- `GET /admin/module-requests`
- `GET /admin/module-requests/:requestId`
- `DELETE /admin/module-requests/:requestId`
  - only allowed while status is `pending`

`POST /admin/module-requests`

```json
{
  "requestedModuleCode": "housekeeping",
  "justification": "Need room cleaning workflow for 80-room property"
}
```

Authorization rule:

- allow only `hoteladmin`
- reject `staff` with 403

### Super Admin APIs

- `GET /super-admin/module-requests`
- `GET /super-admin/module-requests/:requestId`
- `PATCH /super-admin/module-requests/:requestId/approve`
- `PATCH /super-admin/module-requests/:requestId/reject`

Approve request body:

```json
{
  "adminNotes": "Approved for standard plan upgrade"
}
```

Approval side effects:

1. mark request as `approved`
2. create or update `hotelModuleSubscriptions`
3. create hotel inbox notification
4. optionally email hotel admin

## C. Super Admin to Hotel Notifications

### Super Admin APIs

- `GET /super-admin/notifications`
- `POST /super-admin/notifications`
- `GET /super-admin/notifications/:notificationId`
- `PATCH /super-admin/notifications/:notificationId`
- `DELETE /super-admin/notifications/:notificationId`

Create notification body:

```json
{
  "title": "New Housekeeping Module Available",
  "message": "Housekeeping is now available for activation.",
  "type": "new-feature",
  "priority": "medium",
  "audience": "selected-hotels",
  "audienceDetails": {
    "hotelIds": ["hotel_1", "hotel_2"],
    "moduleCodes": []
  },
  "relatedModuleCode": "housekeeping",
  "publishAt": "2026-03-28T10:00:00Z"
}
```

### Hotel APIs

- `GET /admin/notifications`
- `GET /admin/notifications/:notificationId`
- `PATCH /admin/notifications/:notificationId/read`
- `PATCH /admin/notifications/:notificationId/archive`

Optional staff visibility:

- `GET /staff/notifications`
- `PATCH /staff/notifications/:notificationId/read`

## D. Hotel Promotions to Guests

### Hotel Admin APIs

- `GET /admin/promotions`
- `POST /admin/promotions`
- `GET /admin/promotions/:campaignId`
- `PATCH /admin/promotions/:campaignId`
- `PATCH /admin/promotions/:campaignId/send`
- `PATCH /admin/promotions/:campaignId/cancel`
- `GET /admin/promotions/:campaignId/deliveries`

Create promotion body:

```json
{
  "title": "Weekend Offer",
  "description": "20% off for returning guests",
  "channel": "email",
  "targetType": "past-guests",
  "guestIds": [],
  "offer": {
    "discountType": "percentage",
    "discountValue": 20,
    "promoCode": "WEEKEND20",
    "validFrom": "2026-04-01",
    "validTo": "2026-04-30",
    "termsAndConditions": "Direct bookings only"
  }
}
```

## Validation Rules

### Module Requests

- only hotel admin can create
- module must exist and be requestable
- request must not already be pending
- request should be blocked if module already active

### Notifications

- only super admin can create platform notifications
- target audience must be valid
- expired notifications should not appear in active inbox

### Promotions

- only hotel admin can create by default
- guest consent should be checked before actual delivery
- target guests must belong to same hotel
- add send rate limits

## Suggested Mongoose Middleware Rules

### For `moduleRequests`

Before create:

- verify `req.user.role === "hoteladmin"`
- verify `req.user.hotelId` exists

### For `promotionCampaigns`

Before send:

- verify campaign belongs to `req.user.hotelId`
- verify actor is `hoteladmin`
- verify target guest list belongs to same hotel

## Product Recommendation

This is a strong product feature if kept in this order:

1. Module catalog
2. Hotel module entitlement
3. Hotel admin request flow
4. Admin to hotel inbox notifications
5. Hotel promotions to guests
6. SMS/email provider integration

## Immediate Implementation Recommendation

Implement these first:

1. `modules`
2. `hotelModuleSubscriptions`
3. `moduleRequests`
4. `adminNotifications`
5. `hotelNotificationInbox`

Then add promotion campaigns after the admin-side request and notification flow is stable.
