import LambdaServiceClient, { Determinism } from './index';
import dotenv from 'dotenv';

// load environmental variables from .env
dotenv.config();

// unmock aws calls, since this is an integration test
jest.unmock('aws-sdk');

// load test details from env vars
const testPayload = JSON.parse(process.env.EXECUTE_PAYLOAD as string);
const namespace = process.env.EXECUTE_NAMESPACE as string;
const handlerName = process.env.EXECUTE_HANDLER_NAME as string;

class ServiceImagesClient extends LambdaServiceClient {
  constructor() {
    super({ namespace });
  }
  public async doAwesomeThing(payload: any) {
    return await super.execute({ handlerName, event: payload });
  }
  public async doAwesomeTimeDeterministicThing(payload: any) {
    return await super.execute({ handlerName, event: payload, determinism: Determinism.TIME_DETERMINISTIC });
  }
}
const testClient = new ServiceImagesClient();

// run the test
describe('lambda-service-client', () => {
  jest.setTimeout(30000); // since we dont care about how fast they execute
  it('should be able to invoke an aws-lambda-function with the namespace requested', async () => {
    await testClient.doAwesomeThing(testPayload);
  });
  it('should throw a helpful error if an error response is detected', async () => {
    try {
      await testClient.doAwesomeThing({ missing: 'data' });
      throw new Error('should not reach here');
    } catch (error) {
      expect(error.constructor.name).toEqual('LambdaInvocationError');
    }
  });
  it('should be able to invoke an aws-lambda-function with the namespace requested with TIME_DETERMINISTIC request deduplication', async () => {
    const promises = [
      testClient.doAwesomeTimeDeterministicThing(testPayload),
      testClient.doAwesomeTimeDeterministicThing(testPayload),
      testClient.doAwesomeTimeDeterministicThing(testPayload),
    ];
    const result = await testClient.doAwesomeTimeDeterministicThing(testPayload);
    const results = await Promise.all(promises);
    results.forEach(thisResult => expect(thisResult).toEqual(result));
  });
});
