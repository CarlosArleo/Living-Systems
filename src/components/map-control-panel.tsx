'use client';

import * as React from 'react';
import type { MapRef } from 'react-map-gl';
import {
  Globe,
  Plus,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';

type MapControlPanelProps = {
  mapRef: React.RefObject<MapRef>;
};

export function MapControlPanel({ mapRef }: MapControlPanelProps) {
  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  return (
    <div className="absolute right-3 top-3 z-10">
      <TooltipProvider>
        <Card className="flex flex-col items-center gap-0.5 border-border/20 bg-background/50 p-1 shadow-lg backdrop-blur-lg rounded-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} className="h-8 w-8">
                <Minus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>
          <Separator className="my-1 bg-border/20" />
           <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Globe className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Toggle 3D Globe</p>
            </TooltipContent>
          </Tooltip>
        </Card>
      </TooltipProvider>
    </div>
  );
}