import fs from "fs";
import path from "path";
import { Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { LoanWorld, type PostBody } from "../support/world";

const SPECIAL_TITLE = `₹ € £ ¥ « » <script>alert(1)</script> "quotes" 'apostrophe' & 😀`;

async function post(
  world: LoanWorld,
  payload: { title: string; body: string; userId?: number },
  evidenceName: string,
) {
  if (!world.api) throw new Error("No API context. Tag the scenario @api.");
  world.lastPayload = payload;
  const response = await world.api.post("/posts", { data: payload });
  world.lastStatus = response.status();
  world.lastContentType = response.headers()["content-type"] ?? "";
  world.lastBody = (await response.json()) as PostBody;
  const file = path.join("reports/api", `${evidenceName}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        request: payload,
        status: world.lastStatus,
        contentType: world.lastContentType,
        body: world.lastBody,
      },
      null,
      2,
    ),
  );
}

When("I post a title that is {int} characters long", async function (this: LoanWorld, count: number) {
  await post(
    this,
    { title: "A".repeat(count), body: "boundary check", userId: 1 },
    "long-title",
  );
});

When("I post a title containing unsupported special characters", async function (this: LoanWorld) {
  await post(this, { title: SPECIAL_TITLE, body: "boundary check", userId: 1 }, "special-characters");
});

When("I post a payload without a userId", async function (this: LoanWorld) {
  await post(this, { title: "No user", body: "missing userId" }, "missing-user-id");
});

Then("the post response is not a server failure", async function (this: LoanWorld) {
  // JSONPlaceholder accepts invalid posts and returns 201. A production API
  // would return 400. The assertion follows the live service, and still fails
  // if the server responds with a 5xx.
  expect(this.lastStatus).toBeLessThan(500);
  expect(this.lastStatus).toBe(201);
  expect(this.lastContentType).toContain("application/json");
  expect(typeof this.lastBody?.id).toBe("number");
  await this.attach(
    JSON.stringify(
      {
        status: this.lastStatus,
        contentType: this.lastContentType,
        id: this.lastBody?.id,
        titleLength: this.lastBody?.title?.length ?? 0,
        hasUserId: this.lastBody ? Object.prototype.hasOwnProperty.call(this.lastBody, "userId") : false,
      },
      null,
      2,
    ),
    "application/json",
  );
});

Then("the created post echoes the submitted title", async function (this: LoanWorld) {
  expect(this.lastBody?.title).toBe(this.lastPayload?.title);
});

Then("the created post has an id and no userId", async function (this: LoanWorld) {
  expect(this.lastBody?.id).toBeGreaterThan(0);
  expect(this.lastBody ? Object.prototype.hasOwnProperty.call(this.lastBody, "userId") : false).toBe(false);
});
