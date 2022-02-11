import { prisma } from "@src/resources";

export const getCurrentNotice = async () => {
  const current = new Date();
  return await prisma.notice.findFirst({
    where: {
      startsAt: {
        lte: current,
      },
      endsAt: {
        gte: current,
      },
    },
  });
};
