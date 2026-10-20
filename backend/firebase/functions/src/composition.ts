import { getFirestore } from 'firebase-admin/firestore';
import { ActionRouter } from './shared/dispatch/ActionRouter';
import { UuidGenerator } from './shared/id/IdGenerator';
import { SystemClock } from './shared/time/Clock';
import { CategoryCommands } from './modules/device-management/application/CategoryCommands';
import { EquipmentCommands } from './modules/device-management/application/EquipmentCommands';
import { MaintenanceCommands } from './modules/device-management/application/MaintenanceCommands';
import { deviceActions } from './modules/device-management/endpoints/DeviceEndpoints';
import { FirestoreDeviceStore } from './modules/device-management/persistence/firestore/FirestoreDeviceStore';
import { ExpenseCommands } from './modules/expense-tracking/application/ExpenseCommands';
import { GenerateFixedExpenses } from './modules/expense-tracking/application/GenerateFixedExpenses';
import { PaymentMethodCommands } from './modules/expense-tracking/application/PaymentMethodCommands';
import { TemplateCommands } from './modules/expense-tracking/application/TemplateCommands';
import { expenseActions } from './modules/expense-tracking/endpoints/ExpenseEndpoints';
import { FirestoreExpenseStore } from './modules/expense-tracking/persistence/firestore/FirestoreExpenseStore';
import { AccessIndexService, AccessService } from './modules/identity/application/AccessService';
import { ClaimCommands } from './modules/identity/application/ClaimCommands';
import { RoleCommands } from './modules/identity/application/RoleCommands';
import { SeedIdentity } from './modules/identity/application/SeedIdentity';
import { UserCommands } from './modules/identity/application/UserCommands';
import { identityActions } from './modules/identity/endpoints/IdentityEndpoints';
import { FirestoreIdentityStore } from './modules/identity/persistence/firestore/FirestoreIdentityStore';

// The only place that wires implementations to ports. Modules never reach each other's internals.
export function buildApp() {
  const db = getFirestore();
  const clock = new SystemClock();
  const ids = new UuidGenerator();

  const identityStore = new FirestoreIdentityStore(db);
  const accessIndex = new AccessIndexService(identityStore, clock);
  const access = new AccessService(identityStore, clock);
  const deviceStore = new FirestoreDeviceStore(db);
  const expenseStore = new FirestoreExpenseStore(db);

  const router = new ActionRouter(
    [
      ...identityActions({
        users: new UserCommands(identityStore, ids, accessIndex),
        roles: new RoleCommands(identityStore, ids, accessIndex),
        claims: new ClaimCommands(identityStore),
        access,
      }),
      ...deviceActions({
        categories: new CategoryCommands(deviceStore, ids),
        equipment: new EquipmentCommands(deviceStore, ids),
        maintenance: new MaintenanceCommands(deviceStore, ids),
      }),
      ...expenseActions({
        expenses: new ExpenseCommands(expenseStore, ids),
        paymentMethods: new PaymentMethodCommands(expenseStore),
        templates: new TemplateCommands(expenseStore, ids),
        generateFixed: new GenerateFixedExpenses(expenseStore),
      }),
    ],
    access,
    clock,
  );

  const seed = new SeedIdentity(identityStore, ids, accessIndex, clock);
  return { router, seed };
}
