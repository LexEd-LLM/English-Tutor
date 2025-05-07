"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const DokExplanation = () => {
  const [open, setOpen] = useState(false);

  return (
    <div
      data-testid="dok-container"
      className="flex justify-between border-t border-gray-300 pt-4"
    >
      <div className="flex gap-2 items-center">
        <p className="text-sm font-semibold">Depth of Knowledge (DOK)</p>
        <button onClick={() => setOpen(true)}>
          <Info className="w-4 h-4 text-gray-400" />
        </button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>What is Depth of Knowledge (DOK)</DialogTitle>
            </DialogHeader>

            <div className="text-sm space-y-4">
              <p>
                Một khuôn khổ để hiểu sự phức tạp của nhiệm vụ. Dưới đây là mô tả
                ngắn gọn về từng cấp độ:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <span className="font-bold">DOK Level 1 – Remembering:</span> 
                  Simply recall basic facts, terms, or concepts.
                </li>
                <li>
                  <span className="font-bold">DOK Level 2 - Skills/Concepts:</span>{" "}
                  Apply knowledge or procedures to solve problems.
                </li>
                <li>
                  <span className="font-bold">DOK Level 3 - Strategic Thinking:</span>{" "}
                  Involves deep understanding, reasoning, and complex decision making.
                </li>
              </ul>
            </div>

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>OK</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
