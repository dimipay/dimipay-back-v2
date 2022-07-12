import { prisma } from "@src/resources";

export const getProducts = async (key: {
  productIds?: string[];
  barcode?: string;
}) => {
  const current = new Date();
  return await prisma.product.findMany({
    where: {
      OR: {
        systemId: { in: key.productIds },
        barcode: key.barcode,
      },
    },
    include: {
      category: {
        include: {
          discountPolicy: {
            where: {
              relatedEvent: {
                OR: [
                  {
                    startsAt: {
                      lte: current,
                    },
                    endsAt: {
                      gte: current,
                    },
                  },
                  {
                    startsAt: {
                      lte: current,
                    },
                    endsAt: null,
                  },
                  {
                    startsAt: null,
                    endsAt: {
                      gte: current,
                    },
                  },
                  {
                    startsAt: null,
                    endsAt: null,
                  },
                ],
              },
            },
            orderBy: [
              {
                createdAt: "desc",
              },
            ],
          },
        },
      },
      excludedDiscountPolicy: {
        where: {
          relatedEvent: {
            OR: [
              {
                startsAt: {
                  lte: current,
                },
                endsAt: {
                  gte: current,
                },
              },
              {
                startsAt: {
                  lte: current,
                },
                endsAt: null,
              },
              {
                startsAt: null,
                endsAt: {
                  gte: current,
                },
              },
              {
                startsAt: null,
                endsAt: null,
              },
            ],
          },
        },
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
      },
      targettedDiscountPolicy: {
        where: {
          relatedEvent: {
            OR: [
              {
                startsAt: {
                  lte: current,
                },
                endsAt: {
                  gte: current,
                },
              },
              {
                startsAt: {
                  lte: current,
                },
                endsAt: null,
              },
              {
                startsAt: null,
                endsAt: {
                  gte: current,
                },
              },
              {
                startsAt: null,
                endsAt: null,
              },
            ],
          },
        },
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
      },
    },
  });
};
