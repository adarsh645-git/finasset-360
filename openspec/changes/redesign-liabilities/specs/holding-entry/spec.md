## MODIFIED Requirements

### Requirement: The modal is opened and closed through the URL
The modal SHALL open from search params on any page in the app shell: `modal=add-asset` (with an optional `class`), `modal=edit&holding=<id>` or `modal=update&holding=<id>`. Each mode SHALL have a fixed title and save label. Closing the modal (Cancel, ×, the backdrop or Esc) SHALL remove the modal params and leave the rest of the URL.

#### Scenario: HE-01 Each mode has its title and save label
- **GIVEN** a Portfolio with a Cash Holding, a Metals Holding and a Stocks Holding
- **WHEN** a page is opened with `<params>`
- **THEN** the modal's title is `<title>` and its save button reads `<save>`

Examples:

| params | title | save |
|---|---|---|
| `modal=add-asset` | Add to portfolio | Add account |
| `modal=add-asset&class=realestate` | Add to portfolio | Add property |
| `modal=add-asset&class=metals` | Add to portfolio | Add asset |
| `modal=edit&holding=<Cash Holding>` | Edit account | Save |
| `modal=edit&holding=<Metals Holding>` | Edit asset | Save |
| `modal=update&holding=<Cash Holding>` | Update value | Save |
| `modal=update&holding=<Stocks Holding>` | Edit positions | Save |

#### Scenario: HE-02 Params that name nothing open nothing
- **GIVEN** a Portfolio with one current Holding and one archived Holding
- **WHEN** a page is opened with `<params>`
- **THEN** `<outcome>`

Examples:

| params | outcome |
|---|---|
| `modal=edit&holding=<archived Holding>` | no modal opens |
| `modal=update&holding=<an id that is not the User's>` | no modal opens |
| `modal=add-asset&class=boats` | the add modal opens with Stocks selected |

#### Scenario: HE-03 Closing keeps the page and its other params
- **GIVEN** the modal open at `/holdings/h1?position=h1~AAPL&modal=edit&holding=h1`
- **WHEN** the User closes it
- **THEN** the URL is `/holdings/h1?position=h1~AAPL`
