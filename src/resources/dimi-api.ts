import { LoginInfo, UserIdentity } from "@src/interfaces";
import { prisma } from "@src/resources";
import { HttpException } from "@src/exceptions";
import bcrypt from "bcrypt";

export const getIdentity = async (
  account: LoginInfo
): Promise<Partial<UserIdentity>> => {
  const userPassword = await prisma.userPassword.findFirst({
    where: { accountName: account.username },
  });
  if (userPassword) {
    const userValidation = bcrypt.compareSync(
      account.password,
      userPassword.passwordHash
    )
      ? true
      : false;
    if (userValidation) {
      const userIdentity = {
        username: account.username,
      };
      return userIdentity;
    } else {
      throw new HttpException(401, "패스워드가 일치하지 않습니다.");
    }
  } else {
    await prisma.userPassword.create({
      data: {
        accountName: account.username,
        passwordHash: bcrypt.hashSync(account.password, 10),
      },
    });
    const userIdentity = {
      username: account.username,
      name: "최재현",
      photofile1: "",
      user_type: "S" as UserIdentity["user_type"],
    };
    return userIdentity;
  }
};
