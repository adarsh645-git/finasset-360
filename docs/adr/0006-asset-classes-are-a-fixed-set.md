# Asset Classes are a fixed, code-defined set

The six Asset Classes (Real estate, Stocks, Cash, Crypto, Metals, Vehicles & other) are a closed list defined in code, each with its colour, noun and Projection rate scope. Users can no longer create their own classes. Route slugs (`/assets/[class]`), design tokens, the Projection Assumptions shape (per-Country vs shared rates), the add-form shapes and the Growth layers all key off this list, so a user-defined class would need its own colour, rate and form, none of which the design has.

To add a class later, ship a code and schema change that adds it as a seventh fixed class; don't reintroduce custom classes. This supersedes the earlier custom-class design (global defaults plus per-User rows).

Decided in [The Asset Class set](https://github.com/adarsh645-git/finasset-360/issues/2) and [Anything you own outside the six Asset Classes?](https://github.com/adarsh645-git/finasset-360/issues/17).

## Status

accepted
