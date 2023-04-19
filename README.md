# Create AWS dynamoDB Tables

CLI tool to create AWS dynamoDB tables from a [AWS SAM](https://aws.amazon.com/de/serverless/sam/) (AWS Serverless Application Model) template.yaml file. This allows to use a local dynamoDB (e.g. [dynamodb-local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) or [dynalite](https://github.com/mhart/dynalite)) for local development.

If the Table exists it will fail with `ERROR: ResourceInUseException`.

## Quick Start

if you locally started dynamodb on port 8000:

`npx sam-dynamodb-create-table -e http://localhost:8000 -f template.yaml`

## Install

*global install*

`npm i -g sam-dynamodb-create-table`

prefered way to use is without installation with `npx`!

## Usage

`sam-dynamodb-create-table --help`

```
Usage: sam-dynamodb-create-table [options]

Options:
  -d, --debug                     output extra debugging information
  -c, --configuration <filename>  configuration file - format JSON
  -f, --file <filename>           sam template.yaml (default: template.yaml)
  -e, --endpoint <url>            dynamoDB endpoint url (default: http://localhost:8000)
  -r, --region <region>           AWS region (default: us-east-1)
  --config-template               output JSON config template (default: false)
  --table-name                    Table name if not provided by the template.yml or template.json
  -h, --help                      display help for command
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. 

## Changes

* **2023-04-18
  - upgrade to AWS-SDK Version 3
  - add support for Cloudformation files
  - add some transformations to fix errors when deployed to a local dynamoDB server
    - fix: set ProvisionedThroughput to 1/1
    - fix: set GlobalSecondaryIndexes / ProvisionedThroughput to 1/1
    - fix: convert GlobalSecondaryIndexes.Projection from string to object

## Authors

* **Andreas Heissenberger** - *Initial work* - [Github](https://github.com/aheissenberger) | [Heissenberger Laboratory](https://www.heissenberger.at)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
