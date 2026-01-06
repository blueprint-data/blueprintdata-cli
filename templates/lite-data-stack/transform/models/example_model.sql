with source_data as (
  select * from {{ source('raw_data', 'sample_data') }}
),

transformed as (
  select
    id,
    -- Add your transformations here
    id as processed_id,
    current_timestamp as processed_at
  from source_data
)

select * from transformed
