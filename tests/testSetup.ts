import Docker from 'dockerode';
import { exec } from 'child_process';
import {RosettaClient} from '../src/icp_rosetta/client';
import {CurveType} from '../src/rosetta_core/keypairs';
import * as path from 'path';
import { sleep } from './utils';

export const ROSETTA_PORT:string = '8081';
export const TEST_IDENTITY_PEM_FILE: string = 'testIdentity.pem';


const getTestIdentityPemFilePath = (): string => {
  const directoryPath = path.dirname(__filename)
  return path.join(directoryPath,TEST_IDENTITY_PEM_FILE)
}

// Function to spin up the Docker container
export const  startDockerContainer = async () => {
    const docker = new Docker();
  
    // Pull the Docker image from Docker Hub
    await docker.pull('dfinity/rosetta-api:latest');
    const portBindings: { [key: string]: Array<{ HostPort: string }> } = {};
    portBindings[`${ROSETTA_PORT}/tcp`] = [{ HostPort: `${ROSETTA_PORT}` }];

    // Create and start the container
    const container = await docker.createContainer({
      Image: 'dfinity/rosetta-api:latest',
      Cmd: ['--port', ROSETTA_PORT],
      HostConfig: {
        PortBindings: portBindings
      },
      ExposedPorts: {
        [`${ROSETTA_PORT}/tcp`]: {}
        }

    });
    await container.start();
    const stream = await container.attach({ stream: true, stdout: true, stderr: true });
    // Listen for data events from the output streams
    stream.on('data', data => {
      // Process the data (stdout or stderr)
      console.log(data.toString('utf-8'));
    });

    // Start streaming the container's output
    stream.pipe(process.stdout);
  };

  export const stopDockerContainer = async () => {
    const docker = new Docker();
    // Find the container by name or ID and stop it
    let container_infos: Docker.ContainerInfo[] = await docker.listContainers({all: true});
    for (let containerInfo of container_infos){
      if (containerInfo.Image.includes('dfinity/rosetta-api:latest')){
        console.log("Killed Docker container with ID: ", containerInfo.Id)
        await docker.getContainer(containerInfo.Id).remove({force :true});
      }
    }
  };

export const waitForRosettaContainerToSyncUp = async (rosettaClient:RosettaClient) => {
    let attempts = 0;
    while (true) {
      try {
        let response = await rosettaClient.networkList();
        return;
      } catch (error) {
        await sleep(5000); // sleep for 5 seconds
        attempts++;
        if (attempts >= 10){
          throw new Error(`Rosetta container did not sync up: ${error}`);
        }
      }
    }
  }


  export const createRosettaClient = async () => {
    let rosettaClient = new RosettaClient(getTestIdentityPemFilePath(), `http://0.0.0.0:${ROSETTA_PORT}`, CurveType.Secp256k1);
    await waitForRosettaContainerToSyncUp(rosettaClient);
    return rosettaClient

  }