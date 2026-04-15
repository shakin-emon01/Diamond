import type { Edge, Node } from "reactflow";

import type { DiamondAstNode } from "./types";

const X_GAP = 250;
const Y_GAP = 130;

const NODE_STYLE = {
  background: "rgba(9, 19, 31, 0.96)",
  border: "1px solid rgba(240, 180, 41, 0.22)",
  color: "#e5edf5",
  borderRadius: "18px",
  width: 210,
  padding: "12px 14px",
  whiteSpace: "pre-line" as const,
  boxShadow: "0 18px 40px rgba(4, 12, 22, 0.32)"
};

const ACTIVE_NODE_STYLE = {
  ...NODE_STYLE,
  border: "2px solid rgba(240, 180, 41, 0.8)",
  boxShadow: "0 0 24px rgba(240, 180, 41, 0.35), 0 18px 40px rgba(4, 12, 22, 0.32)",
  background: "rgba(240, 180, 41, 0.12)"
};

function getTreeWidth(node: DiamondAstNode): number {
  if (!node.children.length) {
    return 1;
  }

  return node.children.reduce((total, child) => total + getTreeWidth(child), 0);
}

export function buildAstGraph(
  ast: DiamondAstNode | null,
  activeNodeType?: string | null,
  activeNodeText?: string | null
): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let counter = 0;
  let activeMatched = false;

  if (!ast) {
    return { nodes, edges };
  }

  function isActiveNode(node: DiamondAstNode): boolean {
    if (activeMatched || !activeNodeType) return false;
    if (node.type !== activeNodeType) return false;
    if (activeNodeText && node.text !== activeNodeText) return false;
    activeMatched = true;
    return true;
  }

  function visit(node: DiamondAstNode, depth: number, startUnit: number): {
    id: string;
    width: number;
    centerUnit: number;
  } {
    const width = getTreeWidth(node);
    const centerUnit = startUnit + width / 2;
    const id = `ast-${counter++}`;
    const active = isActiveNode(node);

    const subtitle =
      node.text && node.text !== "program" && node.text !== "stmts" && node.text !== "block"
        ? `${node.text}${node.arraySize >= 0 ? ` [${node.arraySize}]` : ""}`
        : node.arraySize >= 0
          ? `[${node.arraySize}]`
          : node.valueType !== "unknown"
            ? node.valueType
            : `line ${node.line}`;

    nodes.push({
      id,
      position: {
        x: centerUnit * X_GAP,
        y: depth * Y_GAP
      },
      data: {
        label: `${node.type}\n${subtitle}`,
        line: node.line
      },
      style: active ? ACTIVE_NODE_STYLE : NODE_STYLE,
      className: active ? "ast-node-active" : undefined
    });

    let cursor = startUnit;
    for (const child of node.children) {
      const childLayout = visit(child, depth + 1, cursor);
      edges.push({
        id: `${id}-${childLayout.id}`,
        source: id,
        target: childLayout.id,
        animated: depth < 2,
        style: { stroke: "rgba(148, 163, 184, 0.55)", strokeWidth: 1.25 }
      });
      cursor += childLayout.width;
    }

    return { id, width, centerUnit };
  }

  visit(ast, 0, 0);
  return { nodes, edges };
}
