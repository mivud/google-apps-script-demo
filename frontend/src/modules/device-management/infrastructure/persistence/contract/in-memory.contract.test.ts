import { InMemoryDataService } from '../../../testing/in-memory-data-service'
import { runDataServiceContract } from './data-service.contract'

// Keeps the fake honest: it must satisfy the same contract as the real adapters.
runDataServiceContract('InMemoryDataService', () => new InMemoryDataService())
