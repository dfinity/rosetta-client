import { startDockerContainer, stopDockerContainer, createRosettaClient } from './testSetup';
import { RosettaClient } from '../src/icp_rosetta/client';
import { sleep } from './utils';

describe('ICP Rosetta Endpoints', () => {
  let icpRosettaClient: RosettaClient;
  beforeAll(async () => {
      try {
        await startDockerContainer();
        console.log('Docker container started successfully');
        icpRosettaClient = await createRosettaClient();
      } catch (error) {
        console.error('Error starting Docker container:', error);
        process.exit(1);
      }
    // Longer timeout needed to wait for rosetta to sync up
    },100000);
  
    afterAll(async () => {
      try {
        await stopDockerContainer();
        console.log('Docker container stopped successfully');
      } catch (error) {
        console.error('Error stopping Docker container:', error);
        process.exit(1);
      }
    });

  it('network/list endpoint test', async () => {
    let response = await icpRosettaClient.networkList();
    console.log('network/list response:', response);    
  });
});