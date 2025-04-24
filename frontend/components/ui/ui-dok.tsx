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
        <p className="text-sm font-semibold">Độ sâu kiến thức (DOK)</p>
        <button onClick={() => setOpen(true)}>
          <Info className="w-4 h-4 text-gray-400" />
        </button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chiều sâu kiến thức (DOK) là gì?</DialogTitle>
            </DialogHeader>

            <div className="text-sm space-y-4">
              <p>
                Một khuôn khổ để hiểu sự phức tạp của nhiệm vụ. Dưới đây là mô tả
                ngắn gọn về từng cấp độ:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <span className="font-bold">DOK cấp 1 – Nhớ lại:</span> Đơn giản
                  nhờ lại các sự kiện, thuật ngữ hoặc khái niệm cơ bản.
                </li>
                <li>
                  <span className="font-bold">DOK cấp 2 – Kỹ năng/Khái niệm:</span>{" "}
                  Áp dụng kiến thức hoặc quy trình để giải quyết vấn đề.
                </li>
                <li>
                  <span className="font-bold">DOK cấp 3 – Tư duy chiến lược:</span>{" "}
                  Bao gồm sự hiểu biết sâu sắc, lý luận và ra quyết định phức tạp.
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
