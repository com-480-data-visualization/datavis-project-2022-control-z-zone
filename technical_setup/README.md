# Technical Setup
This technical setup will help you install all the tools and requirements needed to contribute to the project.

## Installation
For the installation make sure you already have [Git](https://desktop.github.com/) and [Anaconda](https://www.anaconda.com/products/distribution) installed. Also make you have [Java installed with Javascript](https://www.java.com/fr/download/manual.jsp).

### Clone github repository
Go to the desired directory and execute the following:
```bash
git clone https://github.com/com-480-data-visualization/datavis-project-2022-control-z-zone.git
```

### Create conda environment from requirement.txt

Replace <env_name> by environment name.

Create empty conda environment
```bash
conda create --name <env_name>
```

Install requirements
```bash
conda install --file /path/to/requirements.txt
```

Activate environment
```bash
conda activate <env_name>
```