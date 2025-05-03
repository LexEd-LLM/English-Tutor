"use server";

import { auth, currentUser } from "@clerk/nextjs";
import { getUserSubscription } from "@/db/queries";

export const checkSubscriptionStatus = async () => {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId || !user) throw new Error("Unauthorized.");

  const userSubscription = await getUserSubscription();
  return userSubscription;
};
