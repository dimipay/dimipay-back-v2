import { Client } from "@notionhq/client";
import { logger } from "@src/resources";
import config from "../config";

const notion = new Client({ auth: config.notionToken });

export const notionLogger = async (
  level: any,
  message: string,
  timestamp: string
) => {
  try {
    const response = await notion.pages.create({
      parent: { database_id: config.notionPageId },
      properties: {
        Level: {
          select: {
            name: level,
          },
        },
        Message: {
          title: [
            {
              text: {
                content: message,
              },
            },
          ],
        },
        Time: {
          date: {
            start: timestamp,
          },
        },
      },
    });
  } catch (e) {
    logger.error(e);
  }
};
