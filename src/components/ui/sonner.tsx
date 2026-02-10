import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-[rgba(5,15,25,0.95)] !backdrop-blur-xl !border !border-[rgba(0,180,216,0.25)] !rounded-xl !shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,180,216,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] !text-white",
          title: "!text-white !font-semibold !text-sm",
          description: "!text-[rgba(176,190,197,0.9)] !text-xs !font-mono",
          actionButton: "!bg-[rgba(0,180,216,0.2)] !text-[#00b4d8] !border !border-[rgba(0,180,216,0.3)] !rounded-lg hover:!bg-[rgba(0,180,216,0.3)] !font-mono !text-xs",
          cancelButton: "!bg-[rgba(255,255,255,0.05)] !text-[rgba(176,190,197,0.8)] !border !border-[rgba(255,255,255,0.1)] !rounded-lg",
          icon: "!text-[#00b4d8]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
