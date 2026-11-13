import { EventSchemas, Inngest } from "inngest";

export interface GenerateEventData {
  projectId: string;
  generationId: string;
  userId: string;
}

type Events = {
  "video/generate.requested": { data: GenerateEventData };
  "video/generate.cancelled": { data: { generationId: string } };
};

export const inngest = new Inngest({ id: "clipforge-ai", schemas: new EventSchemas().fromRecord<Events>() });
