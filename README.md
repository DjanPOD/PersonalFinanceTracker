# PersonalFinanceTracker

This project is a simple personal finance tracker that helps you record and analyze your income and expenses over time.

Features
  1. Add transactions (income or expense) and save them to a CSV file with:

    Date

    Amount

    Category (Income or Expense)

    Description

  2. Calculate the total income and total expenses over a user-defined date range.

  3. Generate a plot that shows the total amount per day over time so you can quickly see spending and earning trends.

How It Works
  1. You enter each transaction with its date, amount, type (income or expense), and a short description.

  2. The program writes these records to a CSV file, which acts as your finance log.

  3. Given a start and end date, the tracker:

    Reads the CSV.

    Filters transactions within that date range.

    Sums income and expense separately to show your totals.

  4. The program then creates a line plot (or bar chart, depending on your implementation) that displays the total balance or daily totals over the selected days, making it easier to visualize your financial activity.

You can customize the CSV file name, date format, and plotting style to fit your own workflow.


