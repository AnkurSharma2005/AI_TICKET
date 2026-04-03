import User from "../models/user.js";

export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new Error("User not found");
  return user;
};
