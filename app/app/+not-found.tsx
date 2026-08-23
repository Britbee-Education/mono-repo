import { useRouter } from "expo-router";
import { BeeStateScreen } from "@/components/ui/BeeStateScreen";

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <BeeStateScreen
      mood="wink"
      bubble="Bzzz… wrong hive tunnel!"
      title="Page Not Found"
      message="This page flew away. Let’s buzz back to a fun spot in BritBee."
      primaryLabel="Take Me Home"
      onPrimary={() => router.replace("/(main)")}
      secondaryLabel="Go to login"
      onSecondary={() => router.replace("/(auth)/login")}
    />
  );
}

