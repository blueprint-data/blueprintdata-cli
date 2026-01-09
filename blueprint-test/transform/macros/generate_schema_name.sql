{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- set default_schema = target.schema -%}
    {%- set target_name = target.name -%}
    {%- set is_ci = env_var("CI", "false") -%}

    {# Extract user from DBT_USER env var #}
    {%- set raw_user = env_var("DBT_USER", "default_user") -%}
    {%- set user = raw_user.split('@')[0] | replace('.', '_') | replace('-', '_') -%}

    {# Production: use configured schema or custom_schema_name #}
    {%- if target_name == 'prod' -%}
        {%- if custom_schema_name is not none -%}
            {{ custom_schema_name | trim }}
        {%- else -%}
            {{ default_schema }}
        {%- endif -%}

    {# Dev/CI: use sandbox datasets with defer support #}
    {%- elif target_name in ['dev', 'ci'] -%}

        {# When --defer flag is used, use production dataset names #}
        {%- if flags.DEFER -%}
            {%- if custom_schema_name is not none -%}
                {{ custom_schema_name | trim }}
            {%- else -%}
                {{ default_schema }}
            {%- endif -%}

        {# Normal dev/CI: use sandbox dataset #}
        {%- else -%}
            {%- if is_ci == "true" -%}
                {# CI mode: use PR-specific sandbox dataset #}
                {%- set pr_number = env_var("DBT_CI_PR_NUMBER", "unknown") -%}
                SANDBOX_CI_PR_{{ pr_number }}
            {%- else -%}
                {# Local development: use user-specific sandbox dataset #}
                SANDBOX_{{ user | upper }}
            {%- endif -%}
        {%- endif -%}

    {%- else -%}
        {# Fallback for any other target #}
        {%- if custom_schema_name is not none -%}
            {{ custom_schema_name | trim }}
        {%- else -%}
            {{ default_schema }}
        {%- endif -%}
    {%- endif -%}

{%- endmacro %}
