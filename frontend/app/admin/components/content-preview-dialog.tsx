"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UnitContent {
  id: number;
  type: "BOOKMAP" | "VOCABULARY" | "DIALOGUE" | "EXERCISE";
  content: string;
  order: number;
}

interface Unit {
  id: number;
  title: string;
  order: number;
  contents: UnitContent[];
}

interface Curriculum {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  units: Unit[];
}

interface ContentPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: "curriculum" | "unit" | "content";
  data: Curriculum | Unit | UnitContent | null;
}

export const ContentPreviewDialog = ({
  isOpen,
  onClose,
  title,
  type,
  data,
}: ContentPreviewDialogProps) => {
  if (!data) return null;

  const renderContent = () => {
    switch (type) {
      case "curriculum": {
        const curriculum = data as Curriculum;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold">Description</h4>
                <p>{curriculum.description || "No description"}</p>
              </div>
              {curriculum.image_url && (
                <div>
                  <h4 className="font-semibold">Image</h4>
                  <img
                    src={curriculum.image_url}
                    alt={curriculum.title}
                    className="max-w-[200px] rounded-md"
                  />
                </div>
              )}
            </div>
            <div>
              <h4 className="font-semibold">Units ({curriculum.units.length})</h4>
              <ul className="list-disc list-inside">
                {curriculum.units.map((unit) => (
                  <li key={unit.id}>
                    {unit.title} - {unit.contents.length} contents
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      }

      case "unit": {
        const unit = data as Unit;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Order</h4>
              <p>{unit.order}</p>
            </div>
            <div>
              <h4 className="font-semibold">Contents ({unit.contents.length})</h4>
              <div className="space-y-2">
                {unit.contents.map((content) => (
                  <div key={content.id} className="p-2 bg-muted rounded-md">
                    <p className="font-medium">{content.type}</p>
                    <p className="text-sm text-muted-foreground">
                      Order: {content.order}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case "content": {
        const content = data as UnitContent;
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Type</h4>
              <p>{content.type}</p>
            </div>
            <div>
              <h4 className="font-semibold">Order</h4>
              <p>{content.order}</p>
            </div>
            <div>
              <h4 className="font-semibold">Content</h4>
              <pre className="p-4 bg-muted rounded-md whitespace-pre-wrap">
                {content.content}
              </pre>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}; 