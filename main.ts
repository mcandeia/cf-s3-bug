import { BUCKET_NAME } from "./constants.ts";
import { TestDO } from "./durableObject.ts";
import { s3HeadObject } from "./s3HeadObject.ts";

export interface Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  TEST_DO: DurableObjectNamespace;
}

export default {
  fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1); // Remove leading slash
    const target = url.searchParams.get("target");

    // If target=do, forward to Durable Object
    if (target === "do") {
      const id = env.TEST_DO.idFromName("test-instance");
      const stub = env.TEST_DO.get(id);
      return stub.fetch(request);
    }

    // Otherwise handle in the worker directly
    return s3HeadObject({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      bucketName: BUCKET_NAME,
      key: path,
      region: env.AWS_REGION,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    });
  },
};

export { TestDO };
