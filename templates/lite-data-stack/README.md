# {{PROJECT_NAME}}

A Lite Data Stack project powered by Meltano (extraction) and dbt (transformation) with {{STORAGE_DISPLAY_NAME}} storage.

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- {{STORAGE_DISPLAY_NAME}} database
- Git

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

### Setup

1. **Clone and navigate to the project**:

   ```bash
   cd {{PROJECT_NAME}}
   ```

2. **Set up Extraction (Meltano)**:

   ```bash
   cd extraction
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install meltano
   meltano install
   ```

3. **Set up Transform (dbt)**:

   ```bash
   cd ../transform
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install dbt-{{STORAGE_TYPE}}
   cp profiles.yml.example profiles.yml
   # Edit profiles.yml with your database credentials
   ```

4. **Run Extraction**:

   ```bash
   cd ../extraction
   meltano run tap-csv target-{{STORAGE_TYPE}}
   ```

5. **Run Transformation**:
   ```bash
   cd transform
   dbt run
   ```

## 📁 Project Structure

```
{{PROJECT_NAME}}/
├── extraction/          # Meltano project for data extraction
│   ├── meltano.yml     # Meltano configuration
│   └── .venv/          # Python virtual environment
├── transform/          # dbt project for data transformation
│   ├── dbt_project.yml # dbt configuration
│   ├── profiles.yml    # Database profiles
│   └── models/         # dbt models
└── .github/
    └── workflows/      # CI/CD workflows
        ├── extract.yml
        └── transform.yml
```

## 🔧 Configuration

### Extraction (Meltano)

Edit `extraction/meltano.yml` to:

- Add data sources (taps)
- Configure destination (target)
- Schedule extraction jobs

### Transform (dbt)

Edit `transform/dbt_project.yml` to:

- Configure model materialization
- Set up testing
- Manage dbt packages

Edit `transform/profiles.yml` to:

- Configure database connections
- Set up different environments (dev, staging, prod)

## 🧪 Testing

### Test Extraction

```bash
cd extraction
meltano test
```

### Test Transform

```bash
cd transform
dbt test
```

## 🔄 CI/CD

This project uses GitHub Actions for automated:

- Data extraction (scheduled hourly)
- Data transformation (triggered after extraction)
- Testing

## 📚 Resources

- [Meltano Documentation](https://docs.meltano.com/)
- [dbt Documentation](https://docs.getdbt.com/)
- [{{STORAGE_DISPLAY_NAME}} Documentation](https://www.{{STORAGE_TYPE}}.com/docs)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## 📄 License

MIT
