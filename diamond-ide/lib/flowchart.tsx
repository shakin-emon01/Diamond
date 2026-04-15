import type { Edge, Node, NodeProps } from "reactflow";
import { Handle, MarkerType, Position } from "reactflow";

import type { DiamondAstNode } from "./types";

type FlowchartNodeKind = "terminal" | "process" | "decision" | "io" | "merge";

export type FlowchartNodeData = {
  kind: FlowchartNodeKind;
  title: string;
  description?: string;
  line: number | null;
};

type SequenceResult = {
  entryId: string;
  exitIds: string[];
  bottomY: number;
};

type GraphBuilder = {
  nodes: Node<FlowchartNodeData>[];
  edges: Edge[];
  counter: number;
};

const ROOT_X = 420;
const ROOT_Y = 28;
const Y_GAP = 150;
const BRANCH_X = 320;

function FlowchartNode({ data }: NodeProps<FlowchartNodeData>) {
  return (
    <div className="diamond-flow-node" title={data.line ? `Line ${data.line}` : undefined}>
      {[
        { id: "target-top", type: "target", position: Position.Top },
        { id: "target-left", type: "target", position: Position.Left },
        { id: "target-right", type: "target", position: Position.Right },
        { id: "target-bottom", type: "target", position: Position.Bottom },
        { id: "source-top", type: "source", position: Position.Top },
        { id: "source-left", type: "source", position: Position.Left },
        { id: "source-right", type: "source", position: Position.Right },
        { id: "source-bottom", type: "source", position: Position.Bottom }
      ].map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type as "source" | "target"}
          position={handle.position}
          className="diamond-flow-handle"
          isConnectable={false}
        />
      ))}

      <div className={`diamond-flow-node__surface diamond-flow-node__surface--${data.kind}`}>
        <div className="diamond-flow-node__content">
          <div className="diamond-flow-node__title">{data.title}</div>
          {data.description ? (
            <div className="diamond-flow-node__description">{data.description}</div>
          ) : null}
          {data.line ? <div className="diamond-flow-node__line">line {data.line}</div> : null}
        </div>
      </div>
    </div>
  );
}

export const flowchartNodeTypes = {
  diamondFlow: FlowchartNode
};

function getNodeStyle(kind: FlowchartNodeKind): Node<FlowchartNodeData>["style"] {
  if (kind === "decision") {
    return {
      width: 176,
      height: 176,
      background: "transparent",
      border: "none",
      padding: 0
    };
  }

  if (kind === "merge") {
    return {
      width: 90,
      height: 90,
      background: "transparent",
      border: "none",
      padding: 0
    };
  }

  return {
    width: kind === "terminal" ? 210 : 250,
    height: kind === "io" ? 120 : 108,
    background: "transparent",
    border: "none",
    padding: 0
  };
}

function createNode(
  builder: GraphBuilder,
  kind: FlowchartNodeKind,
  title: string,
  description: string | undefined,
  line: number | null,
  x: number,
  y: number
) {
  const id = `flow-${builder.counter++}`;

  builder.nodes.push({
    id,
    type: "diamondFlow",
    position: { x, y },
    data: { kind, title, description, line },
    draggable: false,
    selectable: true,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    style: getNodeStyle(kind)
  });

  return id;
}

function connect(
  builder: GraphBuilder,
  source: string,
  target: string,
  options?: {
    label?: string;
    sourceHandle?: string;
    targetHandle?: string;
    animated?: boolean;
  }
) {
  builder.edges.push({
    id: `edge-${builder.edges.length}`,
    source,
    target,
    type: "smoothstep",
    label: options?.label,
    sourceHandle: options?.sourceHandle ?? "source-bottom",
    targetHandle: options?.targetHandle ?? "target-top",
    animated: Boolean(options?.animated),
    style: {
      stroke: "rgba(148, 163, 184, 0.68)",
      strokeWidth: 1.55
    },
    labelStyle: {
      fill: "#f8fafc",
      fontSize: 11,
      fontWeight: 700
    },
    labelBgStyle: {
      fill: "rgba(6, 17, 29, 0.92)",
      stroke: "rgba(255, 255, 255, 0.08)"
    },
    labelBgPadding: [8, 4],
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "rgba(148, 163, 184, 0.68)"
    }
  });
}

function getMainBlock(ast: DiamondAstNode) {
  if (ast.type !== "PROGRAM") {
    return ast;
  }

  return (
    ast.children.find((child) => child.type === "BLOCK" && child.text === "main") ??
    ast.children.find((child) => child.type === "BLOCK") ??
    ast
  );
}

function extractStatements(node: DiamondAstNode | null): DiamondAstNode[] {
  if (!node) {
    return [];
  }

  if (node.type === "BLOCK") {
    if (node.children.length === 1 && node.children[0]?.type === "STATEMENT_LIST") {
      return node.children[0].children;
    }

    return node.children.filter((child) => child.type !== "PARAM_LIST");
  }

  if (node.type === "STATEMENT_LIST") {
    return node.children;
  }

  return [node];
}

function describeExpression(node: DiamondAstNode | null): string {
  if (!node) {
    return "";
  }

  switch (node.type) {
    case "INT_LITERAL":
    case "FLOAT_LITERAL":
    case "STRING_LITERAL":
    case "BOOL_LITERAL":
    case "IDENTIFIER":
    case "EXPRESSION":
      return node.text ?? node.type.toLowerCase();

    case "ARRAY_REF":
      return `${node.text ?? "array"}[${describeExpression(node.children[0] ?? null)}]`;

    case "UNARY_OP":
      return `${node.text ?? ""}${describeExpression(node.children[0] ?? null)}`.trim();

    case "BINARY_OP":
      return [
        describeExpression(node.children[0] ?? null),
        node.text ?? "",
        describeExpression(node.children[1] ?? null)
      ]
        .filter(Boolean)
        .join(" ");

    case "ASSIGNMENT":
      return `${describeExpression(node.children[0] ?? null)} = ${describeExpression(node.children[1] ?? null)}`;

    case "FUNCTION_CALL": {
      const args = node.children[0]?.children.map((child) => describeExpression(child)).join(", ") ?? "";
      return `${node.text ?? "call"}(${args})`;
    }

    default:
      return node.text ?? node.type.toLowerCase();
  }
}

function buildAtomicStep(
  builder: GraphBuilder,
  node: DiamondAstNode,
  x: number,
  y: number,
  titleOverride?: string
): SequenceResult | null {
  if (node.type === "EMPTY") {
    return null;
  }

  let kind: FlowchartNodeKind = "process";
  let title = titleOverride ?? node.type;
  let description: string | undefined;

  switch (node.type) {
    case "DECLARATION": {
      const suffix = node.arraySize >= 0 ? `[${node.arraySize}]` : "";
      const initializer =
        node.arraySize < 0 && node.children.length > 0
          ? ` = ${describeExpression(node.children[node.children.length - 1] ?? null)}`
          : "";
      title = titleOverride ?? `Declare ${node.text ?? "value"}`;
      description = `${node.valueType} ${node.text ?? ""}${suffix}${initializer}`.trim();
      break;
    }

    case "ASSIGNMENT":
      title = titleOverride ?? "Assign";
      description = `${describeExpression(node.children[0] ?? null)} = ${describeExpression(
        node.children[1] ?? null
      )}`;
      break;

    case "PRINT":
      kind = "io";
      title = titleOverride ?? "Output";
      description = `dekhao(${describeExpression(node.children[0] ?? null)})`;
      break;

    case "INPUT":
      kind = "io";
      title = titleOverride ?? "Input";
      description = `nao(${describeExpression(node.children[0] ?? null)})`;
      break;

    case "RETURN":
      kind = "terminal";
      title = titleOverride ?? "Return";
      description = describeExpression(node.children[0] ?? null);
      break;

    case "FUNCTION_CALL":
      title = titleOverride ?? `Call ${node.text ?? "function"}`;
      description = describeExpression(node);
      break;

    case "EXPRESSION":
      title = titleOverride ?? "Step";
      description = describeExpression(node);
      break;

    default:
      title = titleOverride ?? node.type.replaceAll("_", " ");
      description = node.text ?? undefined;
      break;
  }

  const id = createNode(builder, kind, title, description, node.line ?? null, x, y);
  return {
    entryId: id,
    exitIds: [id],
    bottomY: y
  };
}

function buildSequence(
  builder: GraphBuilder,
  statements: DiamondAstNode[],
  x: number,
  y: number
): SequenceResult | null {
  let firstId: string | null = null;
  let exitIds: string[] = [];
  let cursorY = y;
  let bottomY = y;

  for (const statement of statements) {
    const result = buildStatement(builder, statement, x, cursorY);

    if (!result) {
      continue;
    }

    if (!firstId) {
      firstId = result.entryId;
    }

    for (const exitId of exitIds) {
      connect(builder, exitId, result.entryId);
    }

    exitIds = result.exitIds;
    bottomY = result.bottomY;
    cursorY = result.bottomY + Y_GAP;
  }

  if (!firstId) {
    return null;
  }

  return {
    entryId: firstId,
    exitIds,
    bottomY
  };
}

function buildIfStatement(
  builder: GraphBuilder,
  node: DiamondAstNode,
  x: number,
  y: number
): SequenceResult {
  const condition = describeExpression(node.children[0] ?? null) || "condition";
  const decisionId = createNode(builder, "decision", "jodi", condition, node.line ?? null, x, y);

  const thenBranch = buildSequence(
    builder,
    extractStatements(node.children[1] ?? null),
    x - BRANCH_X,
    y + Y_GAP
  );
  const elseBranch = buildSequence(
    builder,
    extractStatements(node.children[2] ?? null),
    x + BRANCH_X,
    y + Y_GAP
  );

  const mergeY = Math.max(thenBranch?.bottomY ?? y, elseBranch?.bottomY ?? y) + Y_GAP;
  const mergeId = createNode(builder, "merge", "Join", undefined, null, x, mergeY);

  if (thenBranch) {
    connect(builder, decisionId, thenBranch.entryId, {
      label: "Yes",
      sourceHandle: "source-left"
    });
    thenBranch.exitIds.forEach((exitId) => connect(builder, exitId, mergeId));
  } else {
    connect(builder, decisionId, mergeId, {
      label: "Yes",
      sourceHandle: "source-left"
    });
  }

  if (elseBranch) {
    connect(builder, decisionId, elseBranch.entryId, {
      label: "No",
      sourceHandle: "source-right"
    });
    elseBranch.exitIds.forEach((exitId) => connect(builder, exitId, mergeId));
  } else {
    connect(builder, decisionId, mergeId, {
      label: "No",
      sourceHandle: "source-right"
    });
  }

  return {
    entryId: decisionId,
    exitIds: [mergeId],
    bottomY: mergeY
  };
}

function buildWhileStatement(
  builder: GraphBuilder,
  node: DiamondAstNode,
  x: number,
  y: number
): SequenceResult {
  const condition = describeExpression(node.children[0] ?? null) || "condition";
  const decisionId = createNode(builder, "decision", "jotokhon", condition, node.line ?? null, x, y);
  const body = buildSequence(
    builder,
    extractStatements(node.children[1] ?? null),
    x - BRANCH_X,
    y + Y_GAP
  );
  const afterY = Math.max(body?.bottomY ?? y, y) + Y_GAP;
  const afterId = createNode(builder, "merge", "Next", undefined, null, x, afterY);

  if (body) {
    connect(builder, decisionId, body.entryId, {
      label: "Loop",
      sourceHandle: "source-left"
    });
    body.exitIds.forEach((exitId) =>
      connect(builder, exitId, decisionId, {
        label: "Repeat",
        targetHandle: "target-top",
        animated: true
      })
    );
  } else {
    connect(builder, decisionId, decisionId, {
      label: "Loop",
      sourceHandle: "source-left",
      targetHandle: "target-top",
      animated: true
    });
  }

  connect(builder, decisionId, afterId, {
    label: "Stop",
    sourceHandle: "source-right"
  });

  return {
    entryId: decisionId,
    exitIds: [afterId],
    bottomY: afterY
  };
}

function buildForStatement(
  builder: GraphBuilder,
  node: DiamondAstNode,
  x: number,
  y: number
): SequenceResult {
  const init = node.children[0] ?? null;
  const conditionNode = node.children[1] ?? null;
  const step = node.children[2] ?? null;
  const bodyNode = node.children[3] ?? null;

  const initResult =
    init && init.type !== "EMPTY" ? buildAtomicStep(builder, init, x, y, "Init") : null;
  const conditionY = initResult ? initResult.bottomY + Y_GAP : y;
  const decisionId = createNode(
    builder,
    "decision",
    "ghurao",
    conditionNode && conditionNode.type !== "EMPTY"
      ? describeExpression(conditionNode)
      : "condition omitted",
    node.line ?? null,
    x,
    conditionY
  );

  if (initResult) {
    initResult.exitIds.forEach((exitId) => connect(builder, exitId, decisionId));
  }

  const body = buildSequence(builder, extractStatements(bodyNode), x - BRANCH_X, conditionY + Y_GAP);
  const stepY = (body?.bottomY ?? conditionY) + Y_GAP;
  const stepResult =
    step && step.type !== "EMPTY" ? buildAtomicStep(builder, step, x - BRANCH_X, stepY, "Step") : null;
  const afterY = Math.max(stepResult?.bottomY ?? body?.bottomY ?? conditionY, conditionY) + Y_GAP;
  const afterId = createNode(builder, "merge", "Next", undefined, null, x, afterY);

  if (body) {
    connect(builder, decisionId, body.entryId, {
      label: "Loop",
      sourceHandle: "source-left"
    });
  } else if (stepResult) {
    connect(builder, decisionId, stepResult.entryId, {
      label: "Loop",
      sourceHandle: "source-left"
    });
  } else {
    connect(builder, decisionId, decisionId, {
      label: "Loop",
      sourceHandle: "source-left",
      targetHandle: "target-top",
      animated: true
    });
  }

  if (body && stepResult) {
    body.exitIds.forEach((exitId) => connect(builder, exitId, stepResult.entryId));
  }

  if (stepResult) {
    stepResult.exitIds.forEach((exitId) =>
      connect(builder, exitId, decisionId, {
        label: "Next",
        targetHandle: "target-top",
        animated: true
      })
    );
  } else if (body) {
    body.exitIds.forEach((exitId) =>
      connect(builder, exitId, decisionId, {
        label: "Next",
        targetHandle: "target-top",
        animated: true
      })
    );
  }

  connect(builder, decisionId, afterId, {
    label: "Done",
    sourceHandle: "source-right"
  });

  return {
    entryId: initResult?.entryId ?? decisionId,
    exitIds: [afterId],
    bottomY: afterY
  };
}

function buildStatement(
  builder: GraphBuilder,
  node: DiamondAstNode,
  x: number,
  y: number
): SequenceResult | null {
  switch (node.type) {
    case "IF":
      return buildIfStatement(builder, node, x, y);

    case "WHILE":
      return buildWhileStatement(builder, node, x, y);

    case "FOR":
      return buildForStatement(builder, node, x, y);

    case "BLOCK":
    case "STATEMENT_LIST":
      return buildSequence(builder, extractStatements(node), x, y);

    default:
      return buildAtomicStep(builder, node, x, y);
  }
}

export function buildFlowchartGraph(ast: DiamondAstNode | null): {
  nodes: Node<FlowchartNodeData>[];
  edges: Edge[];
} {
  const builder: GraphBuilder = {
    nodes: [],
    edges: [],
    counter: 0
  };

  if (!ast) {
    return {
      nodes: [],
      edges: []
    };
  }

  const mainBlock = getMainBlock(ast);
  const statements = extractStatements(mainBlock);
  const startId = createNode(
    builder,
    "terminal",
    "Start",
    "Entry point",
    mainBlock.line ?? null,
    ROOT_X,
    ROOT_Y
  );

  const sequence = buildSequence(builder, statements, ROOT_X, ROOT_Y + Y_GAP);
  const endY = (sequence?.bottomY ?? ROOT_Y + Y_GAP) + Y_GAP;
  const endId = createNode(builder, "terminal", "End", "Program stops", null, ROOT_X, endY);

  if (sequence) {
    connect(builder, startId, sequence.entryId);
    sequence.exitIds.forEach((exitId) => connect(builder, exitId, endId));
  } else {
    connect(builder, startId, endId);
  }

  return {
    nodes: builder.nodes,
    edges: builder.edges
  };
}
