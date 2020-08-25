# ElParking Lighthouse testing utility

Lighthouse-based testing utility

# Usage

##  Console options:
```
 --url <url>                Url for the audit (required)
 --variability <percent>    Percent of variability in score variation (0 by default)
                            example: --variability 0.2)
 --snapshot <snapshotName>  Name of de JSON snapshot file ('lighthouse.json' by default)
                            example: --snapshot lighthouse.json)
 --categories <categories>  Audit categories. Without spaces. Separated by commas
                            example: --categories performance,accessibility,best-practices,seo)
 --help                     Show this message                    Show this message
```