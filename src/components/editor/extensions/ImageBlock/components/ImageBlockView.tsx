"use client";

import { cn } from "~/lib/utils";
import { type Node } from "@tiptap/pm/model";
import {
  type Editor,
  type NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";
import { useCallback, useRef } from "react";
import Image from "next/image";

interface ImageBlockViewProps extends NodeViewProps {
  editor: Editor;
  getPos: () => number | undefined;
  node: Node & {
    attrs: Partial<{
      src: string;
      width: string;
      height: string;
      align: string;
      alt: string;
    }>;
  };
  updateAttributes: (attrs: Record<string, string>) => void;
}

export const ImageBlockView = (props: ImageBlockViewProps) => {
  const { editor, getPos, node } = props;
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const src = node.attrs.src ?? "";
  const width = parseInt(node.attrs.width ?? "600");
  const height = parseInt(node.attrs.height ?? "600");
  const alt = node.attrs.alt ?? "";

  const wrapperClassName = cn(
    node.attrs.align === "left" ? "ml-0" : "ml-auto",
    node.attrs.align === "right" ? "mr-0" : "mr-auto",
    node.attrs.align === "center" && "mx-auto",
  );

  const onClick = useCallback(() => {
    const pos = getPos();
    if (pos !== undefined) {
      editor.commands.setNodeSelection(pos);
    }
  }, [getPos, editor.commands]);

  return (
    <NodeViewWrapper>
      <div className={wrapperClassName} style={{ width: `${width}px` }}>
        <div contentEditable={false} ref={imageWrapperRef}>
          {src ? (
            <Image
              width={width}
              height={height}
              className="block rounded-lg shadow-lg"
              src={src}
              alt={alt}
              onClick={onClick}
            />
          ) : (
            <div
              className="bg-muted rounded-lg shadow-lg flex items-center justify-center text-muted-foreground"
              style={{ width: `${width}px`, height: `${height}px` }}
            >
              No image source
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default ImageBlockView;
