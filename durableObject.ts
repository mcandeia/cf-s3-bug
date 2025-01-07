import { BUCKET_NAME } from "./constants.ts";
import { Env } from "./main.ts";
import { s3HeadObject } from "./s3HeadObject.ts";

export class TestDO implements DurableObject {
  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {}

  fetch(request: Request) {
    const url = new URL(request.url);
    const path = url.pathname.slice(1);

    return s3HeadObject({
      accessKeyId: this.env.AWS_ACCESS_KEY_ID,
      bucketName: BUCKET_NAME,
      key: path,
      region: this.env.AWS_REGION,
      secretAccessKey: this.env.AWS_SECRET_ACCESS_KEY,
    });
  }
}
