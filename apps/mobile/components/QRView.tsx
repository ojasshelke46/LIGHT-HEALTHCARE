import { View } from "react-native";
import QRCode from "react-native-qrcode-svg";

/** Shared QR renderer — booking success screen + appointment detail modal. */
export function QRView({ value, size = 200 }: { value: string; size?: number }) {
  return (
    <View accessibilityLabel="Appointment QR code" className="items-center justify-center p-4">
      <QRCode value={value} size={size} />
    </View>
  );
}
