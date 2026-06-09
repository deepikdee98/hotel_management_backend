const fs = require("fs");
const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const port = process.env.PORT || 5000;
const serverUrl = process.env.API_BASE_URL || `http://localhost:${port}`;
const routesRoot = path.join(__dirname, "../routes");

const rootRouters = [
  { basePath: "", file: "healthRoutes.js" },
  { basePath: "/auth", file: "authRoute.js" },
  { basePath: "/super-admin", file: "SuperAdmin/index.js" },
  { basePath: "/admin", file: "Admin/index.js" },
  { basePath: "/staff", file: "Staff/index.js" },
  { basePath: "/guest", file: "guestRoutes.js" },
  { basePath: "/api/v1/front-office", file: "frontOfficeRoutes.js" },
  { basePath: "/front-office", file: "checkoutRoutes.js" },
  { basePath: "/front-office", file: "frontOfficeRoutes.js" },
  { basePath: "/accounts", file: "accountsRoutes.js" },
  { basePath: "/reports", file: "reportsRoutes.js" },
  { basePath: "/pos", file: "posRoutes.js" },
  { basePath: "/housekeeping", file: "housekeepingRoutes.js" },
  { basePath: "/api/setup", file: "setupOptionRoutes.js" },
  { basePath: "/api/companies", file: "companyRoutes.js" },
  { basePath: "/api/travel-agents", file: "travelAgentRoutes.js" },
  { basePath: "/api/night-audit", file: "nightAuditRoutes.js" },
  { basePath: "/api/referrals", file: "referralRoutes.js" },
];

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Hotel Management API",
      version: "1.0.0",
      description:
        "API documentation for the Hotel Management backend. Endpoints are generated from the Express route files so the Swagger UI stays aligned with mounted routes.",
    },
    servers: [
      {
        url: serverUrl,
        description: "Current API server",
      },
    ],
    tags: [
      { name: "Health", description: "Service health and metrics" },
      { name: "Auth", description: "Authentication and password management" },
      { name: "Super Admin", description: "Super admin hotel, module, notification, and profile APIs" },
      { name: "Admin", description: "Hotel admin APIs" },
      { name: "Staff", description: "Staff-facing APIs" },
      { name: "Guest", description: "Guest lookup APIs" },
      { name: "Front Office", description: "Front-office setup, reservations, reception, folio, and checkout APIs" },
      { name: "Accounts", description: "Accounting, invoices, payments, reports, and settings APIs" },
      { name: "Reports", description: "Operational reports" },
      { name: "POS", description: "Point-of-sale items and orders" },
      { name: "Housekeeping", description: "Housekeeping rooms, staff, and tasks" },
      { name: "Setup", description: "Reusable setup options" },
      { name: "Companies", description: "Company masters" },
      { name: "Travel Agents", description: "Travel agent masters" },
      { name: "Night Audit", description: "Night audit status and manual execution" },
      { name: "Referrals", description: "Referral management" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ApiResponse: {
          type: "object",
          additionalProperties: true,
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Request completed successfully" },
            data: { type: "object", additionalProperties: true },
          },
        },
        ErrorResponse: {
          type: "object",
          additionalProperties: true,
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Something went wrong" },
            error: { type: "string", example: "ValidationError" },
          },
        },
        GenericRequest: {
          type: "object",
          additionalProperties: true,
          example: {
            name: "Example",
            status: "active",
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "admin@example.com" },
            password: { type: "string", format: "password", example: "password123" },
          },
        },
        ForgotPasswordRequest: {
          type: "object",
          required: ["email"],
          properties: {
            email: { type: "string", format: "email", example: "admin@example.com" },
          },
        },
        VerifyOtpRequest: {
          type: "object",
          required: ["email", "otp"],
          properties: {
            email: { type: "string", format: "email", example: "admin@example.com" },
            otp: { type: "string", example: "123456" },
          },
        },
        ResetPasswordRequest: {
          type: "object",
          required: ["email", "otp", "newPassword"],
          properties: {
            email: { type: "string", format: "email", example: "admin@example.com" },
            otp: { type: "string", example: "123456" },
            newPassword: { type: "string", format: "password", example: "newPassword123" },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: { type: "string", format: "password", example: "oldPassword123" },
            newPassword: { type: "string", format: "password", example: "newPassword123" },
          },
        },
      },
      parameters: {
        Page: {
          name: "page",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 1 },
          description: "Page number for paginated endpoints",
        },
        Limit: {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, default: 10 },
          description: "Number of records per page",
        },
        Search: {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search term",
        },
        StartDate: {
          name: "startDate",
          in: "query",
          schema: { type: "string", format: "date" },
          description: "Report start date",
        },
        EndDate: {
          name: "endDate",
          in: "query",
          schema: { type: "string", format: "date" },
          description: "Report end date",
        },
      },
    },
  },
  apis: [path.join(__dirname, "../routes/**/*.js")],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const mutatingMethods = new Set(["post", "put", "patch"]);

const toPosix = (value) => value.replace(/\\/g, "/");

const joinUrl = (...parts) => {
  const joined = parts
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");
  return joined.startsWith("/") ? joined || "/" : `/${joined}`;
};

const toOpenApiPath = (routePath) =>
  routePath
    .replace(/:([A-Za-z0-9_]+)/g, "{$1}")
    .replace(/\*/g, "{wildcard}");

const titleCase = (value) =>
  value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getTag = (apiPath) => {
  if (apiPath === "/health" || apiPath === "/metrics") return "Health";
  if (apiPath.startsWith("/auth")) return "Auth";
  if (apiPath.startsWith("/super-admin")) return "Super Admin";
  if (apiPath.startsWith("/admin")) return "Admin";
  if (apiPath.startsWith("/staff")) return "Staff";
  if (apiPath.startsWith("/guest")) return "Guest";
  if (apiPath.startsWith("/api/v1/front-office") || apiPath.startsWith("/front-office")) return "Front Office";
  if (apiPath.startsWith("/accounts")) return "Accounts";
  if (apiPath.startsWith("/reports")) return "Reports";
  if (apiPath.startsWith("/pos")) return "POS";
  if (apiPath.startsWith("/housekeeping")) return "Housekeeping";
  if (apiPath.startsWith("/api/setup")) return "Setup";
  if (apiPath.startsWith("/api/companies")) return "Companies";
  if (apiPath.startsWith("/api/travel-agents")) return "Travel Agents";
  if (apiPath.startsWith("/api/night-audit")) return "Night Audit";
  if (apiPath.startsWith("/api/referrals")) return "Referrals";
  return "API";
};

const getSummary = (method, apiPath) => {
  const resource = apiPath
    .split("/")
    .filter(Boolean)
    .filter((part) => !part.startsWith("{"))
    .slice(-2)
    .map(titleCase)
    .join(" ");

  const actionByMethod = {
    get: "Get",
    post: "Create",
    put: "Update",
    patch: "Update",
    delete: "Delete",
  };

  return `${actionByMethod[method] || method.toUpperCase()} ${resource || "resource"}`;
};

const getOperationId = (method, apiPath) => {
  const suffix = apiPath
    .replace(/[{}]/g, "")
    .split("/")
    .filter(Boolean)
    .map((part, index) => {
      const cleaned = part.replace(/[^A-Za-z0-9]/g, " ");
      const words = cleaned.split(" ").filter(Boolean);
      const value = words.map(titleCase).join("");
      return index === 0 ? value.charAt(0).toLowerCase() + value.slice(1) : value;
    })
    .join("");

  return `${method}${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`;
};

const getPathParameters = (apiPath) => {
  const params = [];
  const matcher = /{([^}]+)}/g;
  let match;

  while ((match = matcher.exec(apiPath)) !== null) {
    params.push({
      name: match[1],
      in: "path",
      required: true,
      schema: { type: "string" },
    });
  }

  return params;
};

const getQueryParameters = (method, apiPath) => {
  if (method !== "get") return [];

  const params = [];

  if (!apiPath.includes("{") && !apiPath.endsWith("/health") && !apiPath.endsWith("/metrics")) {
    params.push({ $ref: "#/components/parameters/Page" });
    params.push({ $ref: "#/components/parameters/Limit" });
  }

  if (/(reports|audit|transactions|invoices|receipts|payments|expenses|orders|reservations|check-ins|day-book)/i.test(apiPath)) {
    params.push({ $ref: "#/components/parameters/StartDate" });
    params.push({ $ref: "#/components/parameters/EndDate" });
  }

  if (/(hotels|guests|rooms|companies|travel-agents|staff|items|orders|notifications|modules|reservations)/i.test(apiPath)) {
    params.push({ $ref: "#/components/parameters/Search" });
  }

  return params;
};

const getRequestSchemaRef = (method, apiPath) => {
  if (!mutatingMethods.has(method)) return null;
  if (apiPath === "/auth/login" || apiPath === "/auth/super-admin/login") return "#/components/schemas/LoginRequest";
  if (apiPath === "/auth/forgot-password") return "#/components/schemas/ForgotPasswordRequest";
  if (apiPath === "/auth/verify-otp") return "#/components/schemas/VerifyOtpRequest";
  if (apiPath === "/auth/reset-password") return "#/components/schemas/ResetPasswordRequest";
  if (apiPath === "/auth/change-password" || apiPath.endsWith("/change-password")) return "#/components/schemas/ChangePasswordRequest";
  return "#/components/schemas/GenericRequest";
};

const isPublicEndpoint = (apiPath, method) => {
  if (apiPath === "/health" || apiPath === "/metrics") return true;
  if (!apiPath.startsWith("/auth")) return false;
  return !["/auth/logout", "/auth/change-password"].includes(apiPath) && method === "post";
};

const buildOperation = (method, apiPath) => {
  const schemaRef = getRequestSchemaRef(method, apiPath);
  const operation = {
    tags: [getTag(apiPath)],
    summary: getSummary(method, apiPath),
    operationId: getOperationId(method, apiPath),
    parameters: [...getPathParameters(apiPath), ...getQueryParameters(method, apiPath)],
    responses: {
      200: {
        description: "Successful response",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiResponse" },
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      500: {
        description: "Server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  };

  if (!isPublicEndpoint(apiPath, method)) {
    operation.security = [{ bearerAuth: [] }];
  }

  if (schemaRef) {
    operation.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: schemaRef },
        },
      },
    };
  }

  return operation;
};

const resolveRouteFile = (fromFile, requiredPath) => {
  const base = path.resolve(path.dirname(fromFile), requiredPath);
  const candidates = [base, `${base}.js`, path.join(base, "index.js")];
  return candidates.find((candidate) => fs.existsSync(candidate));
};

const extractDirectRoutes = (source) => {
  const routes = [];
  const directRegex = /router\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/g;
  const routeChainRegex = /router\s*\.\s*route\s*\(\s*["'`]([^"'`]+)["'`]\s*\)([\s\S]*?);/g;
  let match;

  while ((match = directRegex.exec(source)) !== null) {
    routes.push({ method: match[1], routePath: match[2] });
  }

  while ((match = routeChainRegex.exec(source)) !== null) {
    const routePath = match[1];
    const chain = match[2];
    const methodRegex = /\.(get|post|put|patch|delete)\s*\(/g;
    let methodMatch;

    while ((methodMatch = methodRegex.exec(chain)) !== null) {
      routes.push({ method: methodMatch[1], routePath });
    }
  }

  return routes;
};

const extractNestedRouters = (source, currentFile) => {
  const nested = [];
  const useRegex = /router\s*\.\s*use\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*require\s*\(\s*["'`]([^"'`]+)["'`]\s*\)\s*\)/g;
  let match;

  while ((match = useRegex.exec(source)) !== null) {
    const resolvedFile = resolveRouteFile(currentFile, match[2]);
    if (resolvedFile) {
      nested.push({ mountPath: match[1], filePath: resolvedFile });
    }
  }

  return nested;
};

const collectRoutes = (filePath, basePath, seen = new Set()) => {
  const source = fs.readFileSync(filePath, "utf8");
  const routes = extractDirectRoutes(source).map(({ method, routePath }) => ({
    method,
    path: joinUrl(basePath, routePath),
  }));

  for (const nested of extractNestedRouters(source, filePath)) {
    const nestedKey = `${toPosix(nested.filePath)}::${joinUrl(basePath, nested.mountPath)}`;
    if (seen.has(nestedKey)) continue;
    seen.add(nestedKey);
    routes.push(...collectRoutes(nested.filePath, joinUrl(basePath, nested.mountPath), seen));
  }

  return routes;
};

const buildGeneratedPaths = () => {
  const paths = {};

  for (const rootRouter of rootRouters) {
    const filePath = path.join(routesRoot, rootRouter.file);
    if (!fs.existsSync(filePath)) continue;

    for (const route of collectRoutes(filePath, rootRouter.basePath)) {
      const apiPath = toOpenApiPath(route.path);
      paths[apiPath] = paths[apiPath] || {};
      paths[apiPath][route.method] = buildOperation(route.method, apiPath);
    }
  }

  return paths;
};

swaggerSpec.paths = {
  ...buildGeneratedPaths(),
  ...(swaggerSpec.paths || {}),
};

const ensureOperationIds = (paths) => {
  const seen = new Map();

  for (const [apiPath, operations] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      const baseOperationId = operation.operationId || getOperationId(method, apiPath);
      const count = seen.get(baseOperationId) || 0;
      seen.set(baseOperationId, count + 1);
      operation.operationId = count === 0 ? baseOperationId : `${baseOperationId}${count + 1}`;
    }
  }
};

ensureOperationIds(swaggerSpec.paths);

module.exports = swaggerSpec;
