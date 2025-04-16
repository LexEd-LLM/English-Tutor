"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentPreviewDialog } from "./content-preview-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";

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

interface PreviewDialogState {
  isOpen: boolean;
  type: "curriculum" | "unit" | "content";
  title: string;
  data: Curriculum | Unit | UnitContent | null;
}

interface EditState {
  type: "curriculum" | "unit" | "content" | null;
  id: number | null;
  field: "title" | "description" | "content" | null;
  value: string;
}

export const QuizManagement = () => {
  const [curriculums, setCurriculums] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "BOOKMAP" | "VOCABULARY" | "DIALOGUE" | "EXERCISE">("all");
  const [viewLevel, setViewLevel] = useState<"curriculum" | "unit" | "content">("curriculum");
  const [selectedItem, setSelectedItem] = useState<{
    curriculumId?: number;
    unitId?: number;
  }>({});
  const [editState, setEditState] = useState<EditState>({
    type: null,
    id: null,
    field: null,
    value: "",
  });
  const [previewDialog, setPreviewDialog] = useState<PreviewDialogState>({
    isOpen: false,
    type: "content",
    title: "",
    data: null,
  });

  useEffect(() => {
    fetchCurriculums();
  }, []);

  const fetchCurriculums = async () => {
    try {
      const response = await fetch("/api/admin/quiz");
      if (!response.ok) throw new Error("Failed to fetch curriculums");
      const data = await response.json();
      setCurriculums(data);
    } catch (error) {
      toast.error("Failed to load curriculums");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: "curriculum" | "unit" | "content", id: number) => {
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    if (!window.confirm(`Are you sure you want to delete this ${type}? This will also delete all related data.`)) return;

    try {
      const response = await fetch(`/api/admin/quiz?type=${type}&id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error(`Failed to delete ${type}`);

      // Update local state based on type
      if (type === "curriculum") {
        setCurriculums(prev => prev.filter(c => c.id !== id));
      } else if (type === "unit") {
        setCurriculums(prev => prev.map(c => ({
          ...c,
          units: c.units.filter(u => u.id !== id)
        })));
      } else {
        setCurriculums(prev => prev.map(c => ({
          ...c,
          units: c.units.map(u => ({
            ...u,
            contents: u.contents.filter(content => content.id !== id)
          }))
        })));
      }

      toast.success(`${typeLabel} deleted successfully`);
    } catch (error) {
      toast.error(`Failed to delete ${type}`);
    }
  };

  const handlePreview = (type: "curriculum" | "unit" | "content", data: Curriculum | Unit | UnitContent) => {
    let title = "";
    if (type === "content") {
      title = `Content Details - ${(data as UnitContent).type}`;
    } else {
      title = `${type.charAt(0).toUpperCase() + type.slice(1)} Details - ${(data as Curriculum | Unit).title}`;
    }
    
    setPreviewDialog({
      isOpen: true,
      type,
      title,
      data,
    });
  };

  const handleStartEdit = (type: "curriculum" | "unit" | "content", id: number, field: "title" | "description" | "content", value: string) => {
    setEditState({ type, id, field, value });
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editState.type && editState.id && editState.field) {
      await handleEdit(editState.type, editState.id, editState.field, editState.value);
      setEditState({ type: null, id: null, field: null, value: "" });
    } else if (e.key === 'Escape') {
      setEditState({ type: null, id: null, field: null, value: "" });
    }
  };

  const handleEdit = async (type: "curriculum" | "unit" | "content", id: number, field: "title" | "description" | "content", value: string) => {
    try {
      const response = await fetch(`/api/admin/${type}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) throw new Error(`Failed to update ${type}`);

      // Update local state based on type and field
      if (type === "curriculum") {
        setCurriculums(prev => prev.map(c => 
          c.id === id ? { ...c, [field]: value } : c
        ));
      } else if (type === "unit") {
        setCurriculums(prev => prev.map(c => ({
          ...c,
          units: c.units.map(u => 
            u.id === id ? { ...u, [field]: value } : u
          )
        })));
      } else {
        setCurriculums(prev => prev.map(c => ({
          ...c,
          units: c.units.map(u => ({
            ...u,
            contents: u.contents.map(content =>
              content.id === id ? { ...content, [field]: value } : content
            )
          }))
        })));
      }

      toast.success(`${type} updated successfully`);
    } catch (error) {
      toast.error(`Failed to update ${type}`);
      console.error(error);
    }
  };

  const handleTitleClick = (type: "curriculum" | "unit", data: Curriculum | Unit) => {
    if (type === "curriculum") {
      setViewLevel("unit");
      setSelectedItem({ curriculumId: data.id });
      
      // Scroll to curriculum section after a short delay to allow for view change
      setTimeout(() => {
        const element = document.getElementById(`curriculum-${data.id}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else if (type === "unit") {
      const unit = data as Unit;
      const curriculum = curriculums.find(c => 
        c.units.some(u => u.id === unit.id)
      );
      
      setViewLevel("content");
      setSelectedItem({ 
        curriculumId: curriculum?.id,
        unitId: unit.id 
      });

      // Scroll to unit section after a short delay
      setTimeout(() => {
        const element = document.getElementById(`unit-${unit.id}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  const renderCurriculumView = () => (
    <>
      {curriculums.map((curriculum) => (
        <Card key={curriculum.id} className="p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {editState.type === "curriculum" && editState.id === curriculum.id ? (
                <Input
                  className="text-2xl font-bold w-[400px]"
                  value={editState.value}
                  onChange={(e) => setEditState(prev => ({ ...prev, value: e.target.value }))}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              ) : (
                <>
                  <h1 
                    className="text-2xl font-bold hover:text-blue-600 cursor-pointer transition-colors"
                    onClick={() => handleTitleClick("curriculum", curriculum)}
                  >
                    {curriculum.title}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStartEdit("curriculum", curriculum.id, "title", curriculum.title)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePreview("curriculum", curriculum)}
              >
                View
              </Button>
              <Button
                variant="dangerOutline"
                size="sm"
                onClick={() => handleDelete("curriculum", curriculum.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </>
  );

  const renderUnitView = () => (
    <>
      {curriculums.map((curriculum) => (
        <Card 
          key={curriculum.id} 
          className="p-6"
          id={`curriculum-${curriculum.id}`}
        >
          <h1 className={cn(
            "text-2xl font-bold mb-6",
            selectedItem.curriculumId === curriculum.id && "text-blue-600"
          )}>
            {curriculum.title}
          </h1>
          <div className="space-y-4">
            {curriculum.units.map((unit) => (
              <div key={unit.id} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {editState.type === "unit" && editState.id === unit.id ? (
                    <Input
                      className="text-xl font-semibold w-[400px]"
                      value={editState.value}
                      onChange={(e) => setEditState(prev => ({ ...prev, value: e.target.value }))}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                  ) : (
                    <>
                      <h2 
                        className="text-xl font-semibold hover:text-blue-600 cursor-pointer transition-colors"
                        onClick={() => handleTitleClick("unit", unit)}
                      >
                        {unit.title}
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit("unit", unit.id, "title", unit.title)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePreview("unit", unit)}
                  >
                    View
                  </Button>
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    onClick={() => handleDelete("unit", unit.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );

  const renderContentView = () => (
    <>
      {curriculums.map((curriculum) => (
        <Card 
          key={curriculum.id} 
          className={cn(
            "p-6",
            selectedItem.curriculumId === curriculum.id && "border-blue-200"
          )}
        >
          <h1 className={cn(
            "text-2xl font-bold mb-6",
            selectedItem.curriculumId === curriculum.id && "text-blue-600"
          )}>
            {curriculum.title}
          </h1>
          {curriculum.units.map((unit) => (
            <div 
              key={unit.id} 
              className="mt-6"
              id={`unit-${unit.id}`}
            >
              <h2 className={cn(
                "text-xl font-semibold mb-4",
                selectedItem.unitId === unit.id && "text-blue-600"
              )}>
                {unit.title}
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unit.contents
                    .filter(content => filter === "all" || content.type === filter)
                    .map((content) => (
                      <TableRow key={content.id}>
                        <TableCell className="capitalize">{content.type.toLowerCase()}</TableCell>
                        <TableCell>{content.order}</TableCell>
                        <TableCell>
                          <div className="space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleStartEdit("content", content.id, "content", content.content)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handlePreview("content", content)}
                            >
                              View
                            </Button>
                            <Button
                              variant="dangerOutline"
                              size="sm"
                              onClick={() => handleDelete("content", content.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </Card>
      ))}
    </>
  );

  if (loading) {
    return <div className="flex justify-center p-8">Loading curriculum data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quiz Management</h2>
        <div className="flex items-center gap-4">
          <Tabs 
            value={viewLevel} 
            onValueChange={(value) => setViewLevel(value as "curriculum" | "unit" | "content")}
          >
            <TabsList>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="unit">Unit</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={filter} onValueChange={(value: typeof filter) => setFilter(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="BOOKMAP">Bookmap</SelectItem>
              <SelectItem value="VOCABULARY">Vocabulary</SelectItem>
              <SelectItem value="DIALOGUE">Dialogue</SelectItem>
              <SelectItem value="EXERCISE">Exercise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewLevel === "curriculum" && renderCurriculumView()}
      {viewLevel === "unit" && renderUnitView()}
      {viewLevel === "content" && renderContentView()}

      <ContentPreviewDialog
        isOpen={previewDialog.isOpen}
        onClose={() => setPreviewDialog(prev => ({ ...prev, isOpen: false }))}
        title={previewDialog.title}
        type={previewDialog.type}
        data={previewDialog.data}
      />
    </div>
  );
}; 