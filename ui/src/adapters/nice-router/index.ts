import type { UIAdapterModule } from "../types";
import { parseNiceRouterStdoutLine } from "./parse-stdout";
import { NiceRouterConfigFields } from "./config-fields";
import { buildNiceRouterConfig } from "./build-config";

export const niceRouterUIAdapter: UIAdapterModule = {
  type: "nice_router",
  label: "Nice Router",
  parseStdoutLine: parseNiceRouterStdoutLine,
  ConfigFields: NiceRouterConfigFields,
  buildAdapterConfig: buildNiceRouterConfig,
};
