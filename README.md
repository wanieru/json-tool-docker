# json-tool-docker

Docker Image which provides a Web UI for editing local JSON-files according to custom-defined JSON Schemas / tsch-objects.

Simply create `.js`-files in the `schemas` volume to define the schemas and which .json-files they should be used for, and put `.json`-files in the `jsons` volume.

The schemas directory contains a couple of examples.

```yml
{
  "version": "3",
  "services": {
    "json-tool-docker": {
      "restart" : "always",
      "image": "wanieru/json-tool-docker:latest",
      "ports": [
        "5000:5000"
      ],
      "volumes":[
        "./schemas:/app/schemas"
        "./jsons:/app/jsons"
      ]
    }
  }
}
```