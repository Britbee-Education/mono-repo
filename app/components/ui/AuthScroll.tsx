import { ScrollView } from "react-native";
import { useLayout } from "@/lib/layout";

export function AuthScroll({ children }: { children: React.ReactNode }) {
  const { headerTop, padX, formMax } = useLayout();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingTop: headerTop,
        paddingHorizontal: padX,
        paddingBottom: 48,
        width: "100%",
        maxWidth: formMax + padX * 2,
        alignSelf: "center",
      }}
    >
      {children}
    </ScrollView>
  );
}
