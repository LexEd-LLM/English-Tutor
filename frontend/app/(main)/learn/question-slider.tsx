import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type QuestionSliderProps = {
  value: number;
  onChange: (value: number) => void;
};

export const QuestionSlider = ({
  value,
  onChange,
}: QuestionSliderProps) => {
  return (
    <div className="w-full space-y-2">
      <Label>Number of Questions: {value}</Label>
      <Slider
        defaultValue={[value]}
        max={50}
        min={1}
        step={1}
        onValueChange={(values: number[]) => onChange(values[0])}
      />
    </div>
  );
}; 