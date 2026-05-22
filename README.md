# SentryML: Linear-Symmetric Spam Email Classifier

SentryML is an interactive, browser-synchronized **Naive Bayes Spam Email Classifier** designed for machine learning educational verification and candidate email content prototyping. Modeled after the **Geometric Balance** design theme, SentryML translates complex statistical probability models into a highly visual, clean, and interactive workbench interface.

## 🛠️ Features Implemented

* **Deterministic Probabilistic Classifier**: Implements a native, zero-dependency Laplace-smoothed Naive Bayes classifier in pure TypeScript.
* **Geometric Balance Theme**: Designed with high-contrast, professional, light-mode displays featuring indigo, emerald, and warm-rose structural colorations.
* **Corpus Sync Grid**: Maintain, append, or delete email vectors directly from/to the training corpus database with instant, fully responsive local state persistence.
* **Log-Odds Coefficient Explorer**: Browse logarithmic weighted impact scores ($ln(P(w|\text{spam}) / P(w|\text{ham}))$) and smoothed prior probability values for all vocabulary tokens in real-time.
* **Evaluation Matrix Modulo**: Features transparent calculations for **Accuracy**, **Precision**, **Recall**, and **F1 Scores** based on hold-out stratification splits.
* **Interactive Sandbox Templates**: Instantly test typical phisher email variations or legitimate business communications through prefabricated templates.

## 📐 The Mathematics Behind Naive Bayes

Naive Bayes is based on the application of **Bayes' Theorem** with the strong (and "naive") assumption of conditional independence between every pair of features (words) given the class label.

Given an email text sequence $d = (w_1, w_2, \dots, w_n)$, we calculate:

$$P(\text{class} \mid d) \propto P(\text{class}) \prod_{i=1}^{n} P(w_i \mid \text{class})$$

We prevent arithmetic underflow errors by translating multiplications into addition of logarithms:

$$\log P(\text{class} \mid d) \propto \log P(\text{class}) + \sum_{i=1}^{n} \log P(w_i \mid \text{class})$$

### 🔒 Laplace Smoothing (Hyperparameter $\alpha$)

To handle unseen words during candidate classification, we apply Laplace Smoothing so that zero count terms do not force the final probability of a document class to be $0$:

$$P(w \mid \text{class}) = \frac{\text{count}(w, \text{class}) + \alpha}{\text{total\_words}(\text{class}) + \alpha \cdot |V|}$$

Where $|V|$ represents the size of the combined database vocabulary.

---

## 🚀 Setting Up Locally

Ensure you have [Node.js](https://nodejs.org/) installed, and run:

```bash
# Install base dependencies
npm install

# Run the development sandbox server
npm run dev

# Bundle the application for deployment
npm run build
```

This project compiles under **Vite** and uses the utility-first **Tailwind CSS** framework.
