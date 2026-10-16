import { InMemoryDataService } from '../../../testing/InMemoryDataService'
import { runDataServiceContract } from './data-service.contract'

// Keeps the fake honest: it must satisfy the same contract as the real adapters.
runDataServiceContract('InMemoryDataService', () => new InMemoryDataService())
