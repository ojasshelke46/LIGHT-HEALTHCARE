/**
 * Book tab (MOB-02, D-51): hosts the staged booking wizard.
 * All flow state lives inside BookingWizard — this route is just the shell.
 */

import { Screen } from "@/components/ui";
import { BookingWizard } from "@/components/BookingWizard";

export default function BookScreen() {
  return (
    <Screen>
      <BookingWizard />
    </Screen>
  );
}
