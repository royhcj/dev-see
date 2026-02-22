<script lang="ts">
  import SchemaTree from './SchemaTree.svelte';
  import type { OpenApiDocument } from '../../lib/openapi/parse.js';
  import { generateSchemaExample, pickOpenApiExample, stringifyExample } from '../../lib/openapi/examples.js';
  import { getSchemaChildren, getSchemaTypeLabel, resolveSchema } from '../../lib/openapi/schema.js';

  interface Props {
    schema: unknown;
    document: OpenApiDocument;
    name?: string;
    required?: boolean;
    depth?: number;
    initiallyExpanded?: boolean;
  }

  let {
    schema,
    document,
    name = 'schema',
    required = false,
    depth = 0,
    initiallyExpanded,
  }: Props = $props();

  const getInitialExpandedState = (): boolean => initiallyExpanded ?? depth < 2;
  let expanded = $state(getInitialExpandedState());

  const resolved = $derived(resolveSchema(schema, document));
  const resolvedSchema = $derived(resolved.schema);
  const children = $derived((resolvedSchema ? getSchemaChildren(resolvedSchema) : []).slice(0, 100));
  const hasChildren = $derived(children.length > 0);
  const typeLabel = $derived((resolvedSchema ? getSchemaTypeLabel(resolvedSchema) : 'unknown').toUpperCase());
  const schemaExample = $derived(
    resolvedSchema
      ? pickOpenApiExample(resolvedSchema) ?? generateSchemaExample(resolvedSchema, document)
      : undefined
  );
  const exampleText = $derived(
    schemaExample !== undefined ? stringifyExample(schemaExample, 'application/json') : ''
  );

  function toggleExpanded(): void {
    expanded = !expanded;
  }

  function formatInlineValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
</script>

<div class="schema-node">
  <div class="schema-line">
    {#if hasChildren}
      <button type="button" class="toggle" onclick={toggleExpanded} aria-label={`Toggle ${name} schema`}>
        {expanded ? '▾' : '▸'}
      </button>
    {:else}
      <span class="toggle-placeholder" aria-hidden="true">•</span>
    {/if}

    <code class="schema-name">{name}</code>
    {#if required}
      <span class="chip required">required</span>
    {/if}
    <span class="chip type">{typeLabel}</span>
    {#if resolvedSchema?.format}
      <span class="chip">{resolvedSchema.format}</span>
    {/if}
    {#if resolvedSchema?.nullable}
      <span class="chip">nullable</span>
    {/if}
    {#if resolvedSchema?.deprecated}
      <span class="chip deprecated">deprecated</span>
    {/if}
  </div>

  {#if resolved.refPath}
    <p class="ref-path">$ref: <code>{resolved.refPath}</code></p>
  {/if}

  {#if resolved.missingRef}
    <p class="schema-warning">Referenced schema could not be resolved.</p>
  {/if}

  {#if resolved.circularRef}
    <p class="schema-warning">Circular schema reference detected.</p>
  {/if}

  {#if resolvedSchema?.description}
    <p class="schema-description">{resolvedSchema.description}</p>
  {/if}

  {#if Array.isArray(resolvedSchema?.enum) && resolvedSchema.enum.length > 0}
    <p class="schema-meta">
      enum:
      {#each resolvedSchema.enum as enumValue, index (`${index}:${formatInlineValue(enumValue)}`)}
        <code>{formatInlineValue(enumValue)}</code>
      {/each}
    </p>
  {/if}

  {#if resolvedSchema && resolvedSchema.default !== undefined}
    <p class="schema-meta">default: <code>{formatInlineValue(resolvedSchema.default)}</code></p>
  {/if}

  {#if !hasChildren && exampleText}
    <details class="example-block">
      <summary>Example</summary>
      <pre>{exampleText}</pre>
    </details>
  {/if}

  {#if hasChildren && expanded}
    <div class="schema-children">
      {#each children as child (child.key)}
        <SchemaTree
          schema={child.schema}
          document={document}
          name={child.label}
          required={child.required}
          depth={depth + 1}
          initiallyExpanded={depth === 0}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .schema-node {
    border-left: 2px solid var(--border-light, #eee);
    margin-left: 0.2rem;
    padding: 0.25rem 0 0.25rem 0.6rem;
  }

  .schema-line {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .toggle {
    width: 1.1rem;
    height: 1.1rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.25rem;
    background: var(--bg-primary, #fff);
    color: var(--text-secondary, #666);
    font: inherit;
    line-height: 1;
    padding: 0;
    cursor: pointer;
  }

  .toggle-placeholder {
    display: inline-flex;
    width: 1.1rem;
    justify-content: center;
    color: var(--text-tertiary, #999);
    font-size: 0.7rem;
  }

  .schema-name {
    font-size: 0.85rem;
    background: var(--code-bg, #f5f5f5);
    border: 1px solid var(--code-border, #e0e0e0);
    border-radius: 0.3rem;
    padding: 0.12rem 0.35rem;
  }

  .chip {
    border: 1px solid var(--border-color, #ddd);
    border-radius: 999px;
    padding: 0.1rem 0.4rem;
    font-size: 0.72rem;
    color: var(--text-secondary, #666);
    background: var(--bg-secondary, #f5f5f5);
  }

  .chip.type {
    color: #1e6fba;
    border-color: #b8d8f5;
    background: #eaf4ff;
  }

  .chip.required {
    color: #ad1457;
    border-color: #f8bbd0;
    background: #fff0f6;
  }

  .chip.deprecated {
    color: #bf360c;
    border-color: #ffccbc;
    background: #fff3ef;
  }

  .ref-path {
    margin: 0.35rem 0 0;
    color: var(--text-secondary, #666);
    font-size: 0.78rem;
  }

  .schema-description {
    margin: 0.35rem 0 0;
    color: var(--text-secondary, #666);
    white-space: pre-wrap;
    font-size: 0.86rem;
  }

  .schema-meta {
    margin: 0.35rem 0 0;
    color: var(--text-secondary, #666);
    font-size: 0.78rem;
    display: flex;
    gap: 0.35rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .schema-meta code,
  .ref-path code {
    font-size: 0.74rem;
    background: var(--code-bg, #f5f5f5);
    border: 1px solid var(--code-border, #e0e0e0);
    border-radius: 0.25rem;
    padding: 0.07rem 0.25rem;
  }

  .schema-warning {
    margin: 0.35rem 0 0;
    color: #bf360c;
    font-size: 0.8rem;
  }

  .schema-children {
    margin-top: 0.35rem;
  }

  .example-block {
    margin-top: 0.4rem;
    border: 1px dashed var(--border-color, #ddd);
    border-radius: 0.4rem;
    padding: 0.35rem 0.5rem;
    font-size: 0.82rem;
    color: var(--text-secondary, #666);
  }

  .example-block summary {
    cursor: pointer;
    font-weight: 600;
  }

  .example-block pre {
    margin: 0.4rem 0 0;
    padding: 0.5rem;
    background: var(--code-bg, #f5f5f5);
    border: 1px solid var(--code-border, #e0e0e0);
    border-radius: 0.35rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--text-primary, #333);
  }
</style>
