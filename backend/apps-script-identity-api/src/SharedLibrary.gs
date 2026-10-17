// Aliases for the "SharedKernelLibrary" library (backend/apps-script-shared-kernel-library), so app code keeps using plain names.
// Only what this app uses is aliased. This file must load first (see filePushOrder in .clasp.json).
var ApiError = SharedKernelLibrary.ApiError;
var AuditRules = SharedKernelLibrary.AuditRules;
var IdRules = SharedKernelLibrary.IdRules;
var ScriptSettings = SharedKernelLibrary.ScriptSettings;
var SystemClock = SharedKernelLibrary.SystemClock;
var UuidIdGenerator = SharedKernelLibrary.UuidIdGenerator;
var Sha256Hasher = SharedKernelLibrary.Sha256Hasher;
var CacheVerifiedTokens = SharedKernelLibrary.CacheVerifiedTokens;
var GoogleIdTokenVerifier = SharedKernelLibrary.GoogleIdTokenVerifier;
var ScriptLockGuard = SharedKernelLibrary.ScriptLockGuard;
var ScriptRowCache = SharedKernelLibrary.ScriptRowCache;
var SpreadsheetSource = SharedKernelLibrary.SpreadsheetSource;
var SpreadsheetTable = SharedKernelLibrary.SpreadsheetTable;
var SheetInstaller = SharedKernelLibrary.SheetInstaller;
var RequestParser = SharedKernelLibrary.RequestParser;
var ResponseWriter = SharedKernelLibrary.ResponseWriter;
var Router = SharedKernelLibrary.Router;
