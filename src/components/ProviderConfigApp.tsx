/**
 * Provider Configuration TUI
 * Interactive interface for managing providers.json
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { Header } from "./Header.js";
import { StatusBadge } from "./StatusBadge.js";
import {
  Provider,
  ProviderCategory,
  CATEGORY_LABELS,
  loadProviderConfig,
  saveProviderConfig,
  addCustomProvider,
  removeCustomProvider,
  disableProvider,
  enableProvider,
  isProviderDisabled,
  createProviderTemplate,
  validateProvider as validateProviderFields,
  getConfigPath,
} from "../lib/provider-config.js";
import { validateProvider, ValidationResult } from "../lib/validate.js";

type View =
  | "list"
  | "add"
  | "edit"
  | "delete"
  | "view"
  | "menu";

interface ProviderWithStatus extends Provider {
  disabled: boolean;
  validationResult?: ValidationResult;
}

// Form field definitions
type FormField =
  | "id"
  | "name"
  | "description"
  | "icon"
  | "type"
  | "category"
  | "configDir"
  | "validationType"
  | "validationValue"
  | "command"
  | "envVars";

const PROVIDER_TYPES = ["api", "proxy", "gateway", "standalone"] as const;
const CATEGORIES: ProviderCategory[] = ["anthropic", "chinese", "local", "standalone"];
const VALIDATION_TYPES = ["env", "http", "command"] as const;

export function ProviderConfigApp(): React.ReactElement {
  const { exit } = useApp();
  const [view, setView] = useState<View>("list");
  const [providers, setProviders] = useState<ProviderWithStatus[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form state for add/edit
  const [formData, setFormData] = useState<Partial<Provider>>({});
  const [currentField, setCurrentField] = useState<FormField>("id");
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  // Load providers on mount
  useEffect(() => {
    loadProviders();
  }, []);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  async function loadProviders() {
    setLoading(true);
    const config = loadProviderConfig();

    // Get validation status for each provider
    const providersWithStatus: ProviderWithStatus[] = await Promise.all(
      config.providers.map(async (p) => {
        const disabled = config.disabled.includes(p.id);
        const validationResult = await validateProvider(p);
        return { ...p, disabled, validationResult };
      })
    );

    setProviders(providersWithStatus);
    setLoading(false);
  }

  // Handle keyboard input for list view
  useInput((input, key) => {
    if (view !== "list") return;

    if (input === "q" || key.escape) {
      exit();
      return;
    }

    if (input === "a") {
      // Add new provider
      setFormData(createProviderTemplate("", ""));
      setCurrentField("id");
      setView("add");
      return;
    }

    if (input === "e" && providers.length > 0) {
      // Edit selected provider
      const provider = providers[selectedIndex];
      // Extract only Provider fields, not the extended status fields
      const { disabled, validationResult, ...providerData } = provider;
      setEditingProvider(providerData);
      setFormData({ ...providerData });
      setCurrentField("name");
      setView("edit");
      return;
    }

    if (input === "d" && providers.length > 0) {
      // Delete selected provider
      setView("delete");
      return;
    }

    if (input === "t" && providers.length > 0) {
      // Toggle enable/disable
      const provider = providers[selectedIndex];
      if (provider.disabled) {
        enableProvider(provider.id);
        setMessage({ text: `Enabled ${provider.name}`, type: "success" });
      } else {
        disableProvider(provider.id);
        setMessage({ text: `Disabled ${provider.name}`, type: "success" });
      }
      loadProviders();
      return;
    }

    if (input === "v" && providers.length > 0) {
      // View provider details
      setView("view");
      return;
    }

    if (input === "r") {
      // Refresh
      loadProviders();
      return;
    }

    // Navigation
    if (key.upArrow || input === "k") {
      setSelectedIndex((i) => Math.max(0, i - 1));
    }
    if (key.downArrow || input === "j") {
      setSelectedIndex((i) => Math.min(providers.length - 1, i + 1));
    }
  });

  // Render loading state
  if (loading) {
    return (
      <Box flexDirection="column">
        <Header subtitle="Provider Configuration" />
        <Box>
          <Text color="yellow">
            <Spinner type="dots" /> Loading providers...
          </Text>
        </Box>
      </Box>
    );
  }

  // Render based on current view
  switch (view) {
    case "list":
      return (
        <ProviderListView
          providers={providers}
          selectedIndex={selectedIndex}
          message={message}
          onBack={() => exit()}
        />
      );

    case "add":
      return (
        <ProviderFormView
          title="Add New Provider"
          formData={formData}
          currentField={currentField}
          onFieldChange={(field, value) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
          }}
          onNextField={(field) => setCurrentField(field)}
          onSave={() => {
            const errors = validateProviderFields(formData);
            if (errors.length > 0) {
              setMessage({ text: errors.join(", "), type: "error" });
              return;
            }
            addCustomProvider(formData as Provider);
            setMessage({ text: `Added ${formData.name}`, type: "success" });
            setView("list");
            loadProviders();
          }}
          onCancel={() => {
            setFormData({});
            setView("list");
          }}
        />
      );

    case "edit":
      return (
        <ProviderFormView
          title={`Edit Provider: ${editingProvider?.name}`}
          formData={formData}
          currentField={currentField}
          isEdit
          onFieldChange={(field, value) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
          }}
          onNextField={(field) => setCurrentField(field)}
          onSave={() => {
            const errors = validateProviderFields(formData);
            if (errors.length > 0) {
              setMessage({ text: errors.join(", "), type: "error" });
              return;
            }
            addCustomProvider(formData as Provider);
            setMessage({ text: `Updated ${formData.name}`, type: "success" });
            setView("list");
            setEditingProvider(null);
            loadProviders();
          }}
          onCancel={() => {
            setFormData({});
            setEditingProvider(null);
            setView("list");
          }}
        />
      );

    case "delete":
      return (
        <DeleteConfirmView
          provider={providers[selectedIndex]}
          onConfirm={() => {
            const provider = providers[selectedIndex];
            removeCustomProvider(provider.id);
            setMessage({ text: `Deleted ${provider.name}`, type: "success" });
            setSelectedIndex(Math.max(0, selectedIndex - 1));
            setView("list");
            loadProviders();
          }}
          onCancel={() => setView("list")}
        />
      );

    case "view":
      return (
        <ProviderDetailView
          provider={providers[selectedIndex]}
          onBack={() => setView("list")}
        />
      );

    default:
      return <Text>Unknown view</Text>;
  }
}

// Provider List View Component
interface ProviderListViewProps {
  providers: ProviderWithStatus[];
  selectedIndex: number;
  message: { text: string; type: "success" | "error" } | null;
  onBack: () => void;
}

function ProviderListView({
  providers,
  selectedIndex,
  message,
}: ProviderListViewProps): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Header subtitle="Provider Configuration" />

      {/* Message */}
      {message && (
        <Box marginBottom={1}>
          <Text color={message.type === "success" ? "green" : "red"}>
            {message.type === "success" ? "✓" : "✗"} {message.text}
          </Text>
        </Box>
      )}

      {/* Config path */}
      <Box marginBottom={1}>
        <Text dimColor>Config: {getConfigPath()}</Text>
      </Box>

      {/* Provider list */}
      {providers.length === 0 ? (
        <Box>
          <Text color="yellow">No providers configured. Press 'a' to add one.</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {providers.map((provider, index) => (
            <Box key={provider.id}>
              <Text color={index === selectedIndex ? "cyan" : undefined}>
                {index === selectedIndex ? ">" : " "}{" "}
              </Text>
              <StatusBadge
                valid={provider.validationResult?.valid ?? false}
                loading={false}
              />
              <Text> </Text>
              <Text
                color={provider.disabled ? "gray" : index === selectedIndex ? "cyan" : undefined}
                strikethrough={provider.disabled}
              >
                {provider.name.padEnd(20)}
              </Text>
              <Text dimColor> {provider.category.padEnd(12)}</Text>
              <Text dimColor> {provider.type}</Text>
              {provider.disabled && <Text color="yellow"> [disabled]</Text>}
            </Box>
          ))}
        </Box>
      )}

      {/* Footer with shortcuts */}
      <Box marginTop={1} flexDirection="column">
        <Box>
          <Text dimColor>
            <Text color="cyan">a</Text> add{" "}
            <Text color="cyan">e</Text> edit{" "}
            <Text color="cyan">d</Text> delete{" "}
            <Text color="cyan">v</Text> view{" "}
            <Text color="cyan">t</Text> toggle{" "}
            <Text color="cyan">r</Text> refresh{" "}
            <Text color="cyan">q</Text> quit
          </Text>
        </Box>
        <Box>
          <Text dimColor>
            <Text color="cyan">↑/k</Text> up{" "}
            <Text color="cyan">↓/j</Text> down
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// Provider Form View Component
interface ProviderFormViewProps {
  title: string;
  formData: Partial<Provider>;
  currentField: FormField;
  isEdit?: boolean;
  onFieldChange: (field: string, value: string | Record<string, string>) => void;
  onNextField: (field: FormField) => void;
  onSave: () => void;
  onCancel: () => void;
}

function ProviderFormView({
  title,
  formData,
  currentField,
  isEdit = false,
  onFieldChange,
  onNextField,
  onSave,
  onCancel,
}: ProviderFormViewProps): React.ReactElement {
  const [inputValue, setInputValue] = useState("");
  const [selectMode, setSelectMode] = useState(false);

  // Initialize input value when field changes
  useEffect(() => {
    const value = getFieldValue(formData, currentField);
    setInputValue(value);
    setSelectMode(isSelectField(currentField));
  }, [currentField, formData]);

  function getFieldValue(data: Partial<Provider>, field: FormField): string {
    switch (field) {
      case "id":
        return data.id || "";
      case "name":
        return data.name || "";
      case "description":
        return data.description || "";
      case "icon":
        return data.icon || "";
      case "type":
        return data.type || "api";
      case "category":
        return data.category || "standalone";
      case "configDir":
        return data.configDir || "";
      case "validationType":
        return data.validation?.type || "env";
      case "validationValue":
        if (data.validation?.type === "env") return data.validation?.envKey || "";
        if (data.validation?.type === "http") return data.validation?.url || "";
        if (data.validation?.type === "command") return data.validation?.command || "";
        return "";
      case "command":
        return data.command || "";
      default:
        return "";
    }
  }

  function isSelectField(field: FormField): boolean {
    return field === "type" || field === "category" || field === "validationType";
  }

  function getSelectOptions(field: FormField): { label: string; value: string }[] {
    switch (field) {
      case "type":
        return PROVIDER_TYPES.map((t) => ({ label: t, value: t }));
      case "category":
        return CATEGORIES.map((c) => ({ label: CATEGORY_LABELS[c], value: c }));
      case "validationType":
        return VALIDATION_TYPES.map((t) => ({ label: t, value: t }));
      default:
        return [];
    }
  }

  function getNextField(current: FormField): FormField | null {
    const fields: FormField[] = isEdit
      ? ["name", "description", "icon", "type", "category", "configDir", "validationType", "validationValue", "command"]
      : ["id", "name", "description", "icon", "type", "category", "configDir", "validationType", "validationValue", "command"];

    const currentIndex = fields.indexOf(current);
    if (currentIndex < fields.length - 1) {
      return fields[currentIndex + 1];
    }
    return null;
  }

  function getPrevField(current: FormField): FormField | null {
    const fields: FormField[] = isEdit
      ? ["name", "description", "icon", "type", "category", "configDir", "validationType", "validationValue", "command"]
      : ["id", "name", "description", "icon", "type", "category", "configDir", "validationType", "validationValue", "command"];

    const currentIndex = fields.indexOf(current);
    if (currentIndex > 0) {
      return fields[currentIndex - 1];
    }
    return null;
  }

  function handleSubmit() {
    // Save current field value
    saveFieldValue();

    // Move to next field or save
    const nextField = getNextField(currentField);
    if (nextField) {
      onNextField(nextField);
    } else {
      onSave();
    }
  }

  function saveFieldValue() {
    switch (currentField) {
      case "validationType":
        onFieldChange("validation", {
          type: inputValue as "env" | "http" | "command",
        });
        break;
      case "validationValue":
        const valType = formData.validation?.type || "env";
        if (valType === "env") {
          onFieldChange("validation", { type: valType, envKey: inputValue });
        } else if (valType === "http") {
          onFieldChange("validation", { type: valType, url: inputValue });
        } else if (valType === "command") {
          onFieldChange("validation", { type: valType, command: inputValue });
        }
        break;
      default:
        onFieldChange(currentField, inputValue);
    }
  }

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    // Tab to move between fields
    if (key.tab) {
      saveFieldValue();
      const nextField = key.shift ? getPrevField(currentField) : getNextField(currentField);
      if (nextField) {
        onNextField(nextField);
      }
      return;
    }
  });

  const fieldLabels: Record<FormField, string> = {
    id: "ID (lowercase, alphanumeric, hyphens)",
    name: "Display Name",
    description: "Description",
    icon: "Icon (emoji)",
    type: "Type",
    category: "Category",
    configDir: "Config Directory (use ~ for home)",
    validationType: "Validation Type",
    validationValue: formData.validation?.type === "env"
      ? "Environment Variable Name"
      : formData.validation?.type === "http"
      ? "Health Check URL"
      : "Command Name",
    command: "Command (for standalone providers)",
    envVars: "Environment Variables (JSON)",
  };

  return (
    <Box flexDirection="column">
      <Header subtitle={title} />

      <Box flexDirection="column" marginBottom={1}>
        {/* Show all fields with current values */}
        {(isEdit
          ? (["name", "description", "icon", "type", "category", "configDir", "validationType", "validationValue", "command"] as FormField[])
          : (["id", "name", "description", "icon", "type", "category", "configDir", "validationType", "validationValue", "command"] as FormField[])
        ).map((field) => (
          <Box key={field}>
            <Text color={field === currentField ? "cyan" : "gray"}>
              {field === currentField ? ">" : " "} {fieldLabels[field]}:{" "}
            </Text>
            {field === currentField ? (
              selectMode ? (
                <SelectInput
                  items={getSelectOptions(field)}
                  initialIndex={getSelectOptions(field).findIndex(
                    (o) => o.value === inputValue
                  )}
                  onSelect={(item) => {
                    setInputValue(item.value);
                    saveFieldValue();
                    const nextField = getNextField(currentField);
                    if (nextField) {
                      onNextField(nextField);
                    }
                  }}
                />
              ) : (
                <TextInput
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSubmit}
                />
              )
            ) : (
              <Text dimColor>{getFieldValue(formData, field) || "(empty)"}</Text>
            )}
          </Box>
        ))}
      </Box>

      <Box>
        <Text dimColor>
          <Text color="cyan">Enter</Text> next field{" "}
          <Text color="cyan">Tab</Text> navigate{" "}
          <Text color="cyan">Esc</Text> cancel
        </Text>
      </Box>
    </Box>
  );
}

// Delete Confirmation View
interface DeleteConfirmViewProps {
  provider: ProviderWithStatus;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirmView({
  provider,
  onConfirm,
  onCancel,
}: DeleteConfirmViewProps): React.ReactElement {
  useInput((input, key) => {
    if (input === "y" || input === "Y") {
      onConfirm();
    } else if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column">
      <Header subtitle="Delete Provider" />

      <Box flexDirection="column" marginBottom={1}>
        <Text color="red">Are you sure you want to delete this provider?</Text>
        <Box marginTop={1}>
          <Text>
            <Text bold>{provider.name}</Text> ({provider.id})
          </Text>
        </Box>
        <Text dimColor>{provider.description}</Text>
      </Box>

      <Box>
        <Text>
          Press <Text color="red">y</Text> to confirm, <Text color="green">n</Text> to cancel
        </Text>
      </Box>
    </Box>
  );
}

// Provider Detail View
interface ProviderDetailViewProps {
  provider: ProviderWithStatus;
  onBack: () => void;
}

function ProviderDetailView({
  provider,
  onBack,
}: ProviderDetailViewProps): React.ReactElement {
  useInput((input, key) => {
    if (key.escape || input === "q" || key.return) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column">
      <Header subtitle={`Provider: ${provider.name}`} />

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color="cyan">ID:</Text>
          <Text> {provider.id}</Text>
        </Box>
        <Box>
          <Text color="cyan">Name:</Text>
          <Text> {provider.name}</Text>
        </Box>
        <Box>
          <Text color="cyan">Description:</Text>
          <Text> {provider.description}</Text>
        </Box>
        <Box>
          <Text color="cyan">Icon:</Text>
          <Text> {provider.icon || "(none)"}</Text>
        </Box>
        <Box>
          <Text color="cyan">Type:</Text>
          <Text> {provider.type}</Text>
        </Box>
        <Box>
          <Text color="cyan">Category:</Text>
          <Text> {CATEGORY_LABELS[provider.category]}</Text>
        </Box>
        <Box>
          <Text color="cyan">Config Dir:</Text>
          <Text> {provider.configDir}</Text>
        </Box>
        <Box>
          <Text color="cyan">Validation:</Text>
          <Text>
            {" "}
            {provider.validation.type}
            {provider.validation.envKey && ` (${provider.validation.envKey})`}
            {provider.validation.url && ` (${provider.validation.url})`}
            {provider.validation.command && ` (${provider.validation.command})`}
          </Text>
        </Box>
        {provider.command && (
          <Box>
            <Text color="cyan">Command:</Text>
            <Text> {provider.command}</Text>
          </Box>
        )}
        {provider.defaultArgs && provider.defaultArgs.length > 0 && (
          <Box>
            <Text color="cyan">Default Args:</Text>
            <Text> {provider.defaultArgs.join(" ")}</Text>
          </Box>
        )}
        {Object.keys(provider.envVars).length > 0 && (
          <Box flexDirection="column">
            <Text color="cyan">Environment Variables:</Text>
            {Object.entries(provider.envVars).map(([key, value]) => (
              <Text key={key} dimColor>
                {"  "}
                {key}={value}
              </Text>
            ))}
          </Box>
        )}
        {provider.envMappings && Object.keys(provider.envMappings).length > 0 && (
          <Box flexDirection="column">
            <Text color="cyan">Environment Mappings:</Text>
            {Object.entries(provider.envMappings).map(([source, target]) => (
              <Text key={source} dimColor>
                {"  "}
                {source} → {target}
              </Text>
            ))}
          </Box>
        )}

        <Box marginTop={1}>
          <Text color="cyan">Status:</Text>
          <Text> </Text>
          <StatusBadge valid={provider.validationResult?.valid ?? false} loading={false} />
          <Text>
            {" "}
            {provider.validationResult?.valid ? "Valid" : provider.validationResult?.message || "Invalid"}
          </Text>
        </Box>

        {provider.disabled && (
          <Box>
            <Text color="yellow">This provider is disabled</Text>
          </Box>
        )}
      </Box>

      <Box>
        <Text dimColor>
          Press <Text color="cyan">Enter</Text> or <Text color="cyan">Esc</Text> to go back
        </Text>
      </Box>
    </Box>
  );
}
